import { kinds } from "../data/story";
import type { StoryKind, Tone } from "../types";

/** What the AI writes for a receipt. Every field is re-checked here, never trusted as sent. */
export type Composed = {
  names: string;
  items: Array<{ label: string; quantity: string }>;
  total: string;
  note: string;
  stamp: string;
};

export const MAX_DESCRIPTION = 280;
export const COMPOSE_MODEL = "claude-haiku-5-5";

// The same widths the PNG export prints, so nothing the AI writes gets cut off there.
const LIMITS = { names: 38, label: 34, quantity: 12, total: 30, note: 46, stamp: 20 } as const;

export const composeSchema = {
  type: "object",
  properties: {
    names: { type: "string", description: `Who or what the receipt is about, at most ${LIMITS.names} characters.` },
    items: {
      type: "array",
      description: "Exactly four receipt lines.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: `A specific moment or thing, at most ${LIMITS.label} characters.` },
          quantity: { type: "string", description: `Starts with "× ", at most ${LIMITS.quantity} characters, e.g. "× 47", "× ∞", "× MORE".` },
        },
        required: ["label", "quantity"],
        additionalProperties: false,
      },
    },
    total: { type: "string", description: `The receipt's total, a short phrase, at most ${LIMITS.total} characters.` },
    note: { type: "string", description: `One line under the total, at most ${LIMITS.note} characters.` },
    stamp: { type: "string", description: `A playful two-or-three word label for who they are in this story, uppercase, at most ${LIMITS.stamp} characters.` },
  },
  required: ["names", "items", "total", "note", "stamp"],
  additionalProperties: false,
} as const;

export const COMPOSE_SYSTEM = [
  "You write the lines of a keepsake receipt: a memory, friendship, trip or season itemised like a shop receipt, warm and specific rather than generic.",
  "Write in the language of the description. A Thai description gets Thai lines; keep each field within its character limit, which matters more for Thai than for English.",
  "Use only what the description gives you plus gentle, plausible detail. Do not invent names of people who are not mentioned.",
  "The quantities are playful counts, not real figures.",
].join(" ");

export function composePrompt(description: string, kind: StoryKind, tone: Tone): string {
  const label = kinds.find((entry) => entry.id === kind)?.label ?? kind;
  return `Receipt type: ${label}. Mood: ${tone}.\n\nDescription:\n${description}`;
}

export function isComposeRequest(value: unknown): value is { description: string; kind: StoryKind; tone: Tone } {
  if (!value || typeof value !== "object") return false;
  const { description, kind, tone } = value as Record<string, unknown>;
  return typeof description === "string" && description.trim().length > 0 && description.length <= MAX_DESCRIPTION
    && kinds.some((entry) => entry.id === kind)
    && (tone === "warm" || tone === "funny" || tone === "honest");
}

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Parses and clamps the model's JSON; null if it is not a usable receipt. */
export function parseComposed(text: string): Composed | null {
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items)) return null;
  const items = raw.items.slice(0, 4).map((item) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    const quantity = clip(entry.quantity, LIMITS.quantity) || "1";
    return { label: clip(entry.label, LIMITS.label), quantity: quantity.startsWith("×") ? quantity : `× ${quantity}`.slice(0, LIMITS.quantity) };
  }).filter((item) => item.label);
  const composed = {
    names: clip(raw.names, LIMITS.names),
    items,
    total: clip(raw.total, LIMITS.total),
    note: clip(raw.note, LIMITS.note),
    stamp: clip(raw.stamp, LIMITS.stamp).toUpperCase(),
  };
  return composed.names && composed.items.length >= 2 && composed.total ? composed : null;
}
