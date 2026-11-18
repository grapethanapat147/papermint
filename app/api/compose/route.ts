import Anthropic from "@anthropic-ai/sdk";
import { env } from "cloudflare:workers";

import { handleCompose } from "../../lib/compose-server";
import { takeComposeSlot, visitorId, type LimitBucket } from "../../lib/rate-limit";

/**
 * Writes a receipt's lines from a short description, with Claude. Off (503)
 * unless the deployment has an ANTHROPIC_API_KEY secret AND the R2 bucket that
 * holds the rate-limit counters; the rest of the app never depends on it.
 */
export async function POST(request: Request) {
  const { ANTHROPIC_API_KEY: apiKey, HANDOFF: bucket } = env as unknown as { ANTHROPIC_API_KEY?: string; HANDOFF?: LimitBucket };
  // No counters, no Claude: an unlimited endpoint is exactly what the limit is for.
  const client = apiKey && bucket ? new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 }) : null;
  return handleCompose(request, client, async () => {
    if (!apiKey || !bucket) return "site";
    const visitor = await visitorId(request.headers.get("cf-connecting-ip") ?? "unknown", apiKey);
    // A storage hiccup should not take the feature down; the key's spend limit is the backstop.
    return takeComposeSlot(bucket, visitor).catch(() => "ok" as const);
  });
}
