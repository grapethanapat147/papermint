import type { Composed } from "./compose-shared";
import type { StoryKind, Tone } from "../types";

/** Asks /api/compose for a draft; throws with a message fit to show the person. */
export async function composeReceipt(description: string, kind: StoryKind, tone: Tone): Promise<Composed> {
  let response: Response;
  try {
    response = await fetch("/api/compose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description, kind, tone }),
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null) as (Composed & { error?: string }) | null;
  if (!response.ok || !body) throw new Error(body?.error ?? "Claude couldn't write this one. Try again.");
  return body;
}
