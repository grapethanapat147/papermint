import { sweepExpired } from "./handoff-shared";

/** Claude calls allowed per visitor per hour, and for the whole site per day. */
export const COMPOSE_LIMITS = { perVisitorPerHour: 10, perSitePerDay: 300 };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PREFIX = "ratelimit/";

export type LimitBucket = Parameters<typeof sweepExpired>[0] & {
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  put(key: string, value: string, options?: { customMetadata?: Record<string, string> }): Promise<unknown>;
};

export type Verdict = "ok" | "visitor" | "site";

/**
 * Who is asking, without keeping who they are: an HMAC of the address under a
 * server secret, so the stored key cannot be reversed by hashing every IPv4.
 */
export async function visitorId(address: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(address)));
  return Array.from(mac.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts one Claude call against the visitor's hour and the site's day, in R2
 * objects that carry their own expiry and are swept like handoffs.
 *
 * shortcut: read-then-write, not atomic, so a burst of parallel requests can
 * slip a few past the limit; fine as a spend guard, use a Durable Object or the
 * Workers rate-limit binding if the limit ever has to be exact.
 */
export async function takeComposeSlot(bucket: LimitBucket, visitor: string, now = Date.now()): Promise<Verdict> {
  const hourEnd = (Math.floor(now / HOUR) + 1) * HOUR;
  const dayEnd = (Math.floor(now / DAY) + 1) * DAY;
  const visitorKey = `${PREFIX}h/${hourEnd}/${visitor}`;
  const siteKey = `${PREFIX}d/${dayEnd}`;

  const [mine, site] = await Promise.all([count(bucket, visitorKey), count(bucket, siteKey)]);
  if (site >= COMPOSE_LIMITS.perSitePerDay) return "site";
  if (mine >= COMPOSE_LIMITS.perVisitorPerHour) return "visitor";

  await Promise.all([
    bucket.put(visitorKey, String(mine + 1), { customMetadata: { expiresAt: String(hourEnd) } }),
    bucket.put(siteKey, String(site + 1), { customMetadata: { expiresAt: String(dayEnd) } }),
  ]);
  // A new window means the previous ones are spent; clear them then, not on every call.
  if (mine === 0) await sweepExpired(bucket, now, PREFIX).catch(() => 0);
  return "ok";
}

async function count(bucket: LimitBucket, key: string): Promise<number> {
  const object = await bucket.get(key);
  const value = object ? Number(await object.text()) : 0;
  return Number.isFinite(value) ? value : 0;
}
