import Anthropic from "@anthropic-ai/sdk";

import { COMPOSE_MODEL, COMPOSE_SYSTEM, composePrompt, composeSchema, isComposeRequest, parseComposed } from "./compose-shared";
import type { Verdict } from "./rate-limit";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * POST /api/compose, minus the Worker plumbing so it can be tested with a fake
 * client. Only text goes to Claude — never the photo.
 * `limit` counts the call against the visitor and the site (see rate-limit.ts)
 * and runs only for a valid request, so a malformed one costs nothing.
 */
export async function handleCompose(
  request: Request,
  client: Pick<Anthropic, "messages"> | null,
  limit: () => Promise<Verdict>,
): Promise<Response> {
  if (!client) return json({ error: "AI writing isn't set up on this site yet." }, 503);

  // Browsers always send Origin on a cross-site POST; refuse other sites spending this key.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Not allowed." }, 403);

  const payload = await request.json().catch(() => null);
  if (!isComposeRequest(payload)) return json({ error: "Describe the story in a few words (up to 280 characters)." }, 400);

  const verdict = await limit();
  if (verdict === "visitor") return json({ error: "That's a lot of receipts this hour. Try again in a while, or write this one yourself." }, 429);
  if (verdict === "site") return json({ error: "Claude has written all it can today. Try again tomorrow, or write this one yourself." }, 429);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: COMPOSE_MODEL,
      // Room for adaptive thinking plus a few hundred tokens of JSON.
      max_tokens: 2048,
      system: COMPOSE_SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema: composeSchema } },
      messages: [{ role: "user", content: composePrompt(payload.description.trim(), payload.kind, payload.tone) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Busy right now. Try again in a minute." }, 429);
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return json({ error: "AI writing isn't set up on this site yet." }, 503);
    }
    if (error instanceof Anthropic.APIError) return json({ error: "Claude couldn't write this one. Try again." }, 502);
    throw error;
  }

  if (response.stop_reason === "refusal") {
    return json({ error: "Claude declined to write this one. Try describing it differently." }, 422);
  }
  const text = response.content.find((block) => block.type === "text");
  const composed = text && response.stop_reason !== "max_tokens" ? parseComposed(text.text) : null;
  if (!composed) return json({ error: "Claude couldn't write this one. Try again." }, 502);
  return json(composed);
}
