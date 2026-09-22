import { env } from "cloudflare:workers";

import { handoffKey, isExpired, isValidHandoffId, type HandoffRecord } from "../../../lib/handoff-shared";

/**
 * Reads a handoff once the other device opens its link.
 *
 * Expiry is enforced here rather than trusted to storage: a record past its
 * 24 hours is deleted and reported gone. A bucket lifecycle rule should also be
 * set so the bytes go even when nobody asks for them again.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const bucket = (env as unknown as { HANDOFF?: R2Bucket }).HANDOFF;
  if (!bucket) {
    return Response.json(
      { error: "Handing off between devices is not available on this deployment." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  if (!isValidHandoffId(id)) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const object = await bucket.get(handoffKey(id));
  if (!object) {
    return Response.json({ error: "This handoff link has expired or never existed." }, { status: 404 });
  }

  let record: HandoffRecord;
  try {
    record = (await object.json()) as HandoffRecord;
  } catch {
    await bucket.delete(handoffKey(id));
    return Response.json({ error: "This handoff could not be read." }, { status: 410 });
  }

  if (isExpired(record)) {
    await bucket.delete(handoffKey(id));
    return Response.json({ error: "This handoff link has expired." }, { status: 410 });
  }

  return Response.json({ story: record.story, photo: record.photo, expiresAt: record.expiresAt });
}
