import { env } from "cloudflare:workers";

import {
  HANDOFF_TTL_MS, MAX_HANDOFF_BYTES, handoffKey, makeHandoffId,
  type HandoffPayload, type HandoffRecord,
} from "../../lib/handoff-shared";

/**
 * Creates a device handoff: the draft plus its photo, behind an unguessable id.
 *
 * No account, no email. The link is the credential, and the record is written
 * with an expiry 24 hours out — see GET, which refuses and deletes anything
 * past it.
 */
export async function POST(request: Request) {
  const bucket = (env as unknown as { HANDOFF?: R2Bucket }).HANDOFF;
  if (!bucket) {
    return Response.json(
      { error: "Handing off between devices is not available on this deployment." },
      { status: 503 },
    );
  }

  let payload: HandoffPayload;
  try {
    payload = (await request.json()) as HandoffPayload;
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!payload?.story || typeof payload.story !== "object" || !Array.isArray(payload.story.items)) {
    return Response.json({ error: "A story is required." }, { status: 400 });
  }
  if (payload.photo !== null && typeof payload.photo !== "string") {
    return Response.json({ error: "photo must be a data URL or null." }, { status: 400 });
  }

  const record: HandoffRecord = {
    story: payload.story,
    photo: payload.photo ?? null,
    expiresAt: Date.now() + HANDOFF_TTL_MS,
  };
  const body = JSON.stringify(record);

  if (new TextEncoder().encode(body).length > MAX_HANDOFF_BYTES) {
    return Response.json(
      { error: "That receipt is too large to hand off. Try a smaller photo." },
      { status: 413 },
    );
  }

  const id = makeHandoffId();
  await bucket.put(handoffKey(id), body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { expiresAt: String(record.expiresAt) },
  });

  return Response.json({ id, expiresAt: record.expiresAt }, { status: 201 });
}
