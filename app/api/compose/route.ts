import Anthropic from "@anthropic-ai/sdk";
import { env } from "cloudflare:workers";

import { handleCompose } from "../../lib/compose-server";

/**
 * Writes a receipt's lines from a short description, with Claude. Off (503)
 * unless the deployment has an ANTHROPIC_API_KEY secret; the rest of the app
 * never depends on it.
 */
export async function POST(request: Request) {
  const apiKey = (env as unknown as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
  return handleCompose(request, apiKey ? new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 }) : null);
}
