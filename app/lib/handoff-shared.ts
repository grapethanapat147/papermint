import type { SharedStory } from "../types";

/** How long a handoff survives. Decided 2026-09-21; see the decision doc. */
export const HANDOFF_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Upper bound on a stored handoff. The photo is downscaled to roughly the
 * receipt's own frame before upload, so anything much larger means the
 * downscale did not run and the request is refused rather than stored.
 */
export const MAX_HANDOFF_BYTES = 600_000;

export type HandoffPayload = {
  story: SharedStory;
  /** Data URL of the downscaled photo, or null when the receipt has none. */
  photo: string | null;
};

export type HandoffRecord = HandoffPayload & { expiresAt: number };

/** 22 unguessable characters. The link is the only credential. */
export function makeHandoffId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export const isValidHandoffId = (id: string) => /^[A-Za-z0-9_-]{22}$/.test(id);

export const handoffKey = (id: string) => `handoff/${id}`;

export function isExpired(record: { expiresAt: number }, now = Date.now()) {
  return record.expiresAt <= now;
}

/**
 * How many objects one sweep looks at. Keeps the create request quick while
 * still clearing far more than a single request can add.
 */
export const SWEEP_LIMIT = 200;

/**
 * Deletes handoffs whose 24 hours are up.
 *
 * Runs opportunistically on create so expiry does not depend on a bucket
 * lifecycle rule, which lives in the Cloudflare dashboard rather than in this
 * repo. Expiry is read from object metadata, so nothing is downloaded.
 * Returns how many were removed.
 */
export async function sweepExpired(
  bucket: {
    list(options?: { prefix?: string; limit?: number; include?: ("customMetadata" | "httpMetadata")[] }): Promise<{
      objects: { key: string; customMetadata?: Record<string, string> }[];
    }>;
    delete(key: string): Promise<void>;
  },
  now = Date.now(),
): Promise<number> {
  const listing = await bucket.list({ prefix: "handoff/", limit: SWEEP_LIMIT, include: ["customMetadata"] });
  const stale = listing.objects.filter((object) => {
    const raw = object.customMetadata?.expiresAt;
    if (!raw) return true; // written before metadata existed, or tampered with
    const expiresAt = Number(raw);
    return !Number.isFinite(expiresAt) || expiresAt <= now;
  });
  await Promise.all(stale.map((object) => bucket.delete(object.key)));
  return stale.length;
}
