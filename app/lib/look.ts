import { kinds } from "../data/story";
import { builtInTemplates } from "../data/templates";
import type { Accent, Decoration, EdgeStyle, FontStyle, PaperTone, SharedStory, StoryKind, Tone } from "../types";

/**
 * How a receipt looks, and nothing it says. This is what the QR printed on an
 * exported image carries: short enough to scan off a phone screen, and free of
 * names, lines and photos, so a public image never leaks more than it shows.
 */
export type Look = {
  kind: StoryKind; tone: Tone; decoration: Decoration; accent: Accent;
  fontStyle: FontStyle; paperTone: PaperTone; edgeStyle: EdgeStyle; textScale: number;
};

export const lookOptions = {
  kind: kinds.map((entry) => entry.id),
  tone: ["warm", "funny", "honest"],
  decoration: ["classic", "botanical", "mono", "playful"],
  accent: ["coral", "sage", "ink", "mustard", "lavender", "blue"],
  fontStyle: ["editorial", "rounded", "mono"],
  paperTone: ["cream", "white", "blush", "sage"],
  edgeStyle: ["torn", "straight", "rounded"],
} as const;
export const lookOrder = ["kind", "tone", "decoration", "accent", "fontStyle", "paperTone", "edgeStyle"] as const;
// Same range as the Text size slider.
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.35;

/**
 * One letter per option (each option's first letter is unique within its set),
 * then the text size in percent: trip/funny/botanical/sage/rounded/sage/rounded
 * at 110% is "tfbsrsr110". Every character saved shrinks the printed QR.
 */
export function encodeLook(look: Look): string {
  return lookOrder.map((key) => look[key][0]).join("") + Math.round(look.textScale * 100);
}

/** Parses a scanned look; anything unknown, missing or out of range rejects the whole thing. */
export function decodeLook(value: string): Look | null {
  const match = value.match(/^([a-z]{7})(\d{2,3})$/);
  if (!match) return null;
  const look: Record<string, string | number> = {};
  for (const [index, key] of lookOrder.entries()) {
    const option = (lookOptions[key] as readonly string[]).find((entry) => entry[0] === match[1][index]);
    if (!option) return null;
    look[key] = option;
  }
  const scale = Number(match[2]) / 100;
  if (scale < MIN_SCALE || scale > MAX_SCALE) return null;
  look.textScale = scale;
  return look as Look;
}

export function lookUrl(base: string, look: Look): string {
  return `${base}#t=${encodeLook(look)}`;
}

/**
 * What to show someone who scanned a look. With a draft of their own on this
 * device, they keep every word of it and only the look changes; without one,
 * they get that kind's shipped template in the scanned look, so they land on a
 * receipt that resembles the image they scanned.
 */
export function storyFromLook(look: Look, saved: SharedStory | null): SharedStory {
  const { decoration, accent, fontStyle, paperTone, edgeStyle, textScale } = look;
  const style = { decoration, accent, fontStyle, paperTone, edgeStyle, textScale };
  if (saved) return { ...saved, ...style };
  const template = builtInTemplates.find((entry) => entry.kind === look.kind) ?? builtInTemplates[0];
  return {
    ...style,
    kind: look.kind,
    tone: look.tone,
    names: kinds.find((entry) => entry.id === look.kind)?.prompt ?? "",
    note: template.note,
    total: template.total,
    items: template.items.map(({ label, quantity }, index) => ({ id: `look-${index}`, label, quantity })),
    stickers: [],
    edition: 824,
  };
}
