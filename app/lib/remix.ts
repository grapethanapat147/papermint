import { builtInTemplates } from "../data/templates";
import { kinds, newLine, storyLines } from "../data/story";
import type { StoryItem } from "../types";

/**
 * Words the app wrote, as opposed to words the person wrote. Remix, a story
 * type and a template may replace the first freely; the second is their work,
 * and losing it to a button that sounds like "try another version" is the
 * fastest way to make someone give up on their first receipt.
 */
const sampleLines = new Set<string>([
  ...Object.values(storyLines).flatMap((tones) => Object.values(tones).flat().map(([label, quantity]) => `${label}\u0000${quantity}`)),
  ...builtInTemplates.flatMap((template) => template.items.map(({ label, quantity }) => `${label}\u0000${quantity}`)),
  `${newLine.label}\u0000${newLine.quantity}`,
]);

const sampleNames = new Set(kinds.map((entry) => entry.prompt));

/**
 * Lines and a subject Claude wrote count as the app's words too, so the next
 * Remix or AI draft may replace them while anything the person edits stays.
 *
 * shortcut: remembered for this page load only; after a reload, AI lines count
 * as the person's own and are kept. Persist the marks with the draft if that
 * starts to bite.
 */
export function markAsSample(lines: Array<Pick<StoryItem, "label" | "quantity">>, names?: string): void {
  for (const line of lines) sampleLines.add(`${line.label}\u0000${line.quantity}`);
  if (names) sampleNames.add(names);
}

/** True for a line exactly as the app wrote it; any edit, label or quantity, makes it theirs. */
export function isSampleLine(item: Pick<StoryItem, "label" | "quantity">): boolean {
  return sampleLines.has(`${item.label}\u0000${item.quantity}`);
}

/** True when the subject is empty or still one of the story types' example prompts. */
export function isSampleName(names: string): boolean {
  return !names.trim() || sampleNames.has(names);
}

/**
 * Re-rolls the sample lines and keeps the person's own, in place. A sample row
 * takes the fresh line at its own position, so rows do not shuffle; if that
 * line is already on the receipt (or there is none), it takes the next unused
 * one, and when fresh lines run out the row stays as it was.
 */
export function remixItems(current: StoryItem[], fresh: StoryItem[]): { items: StoryItem[]; kept: number } {
  const taken = new Set(current.filter((item) => !isSampleLine(item)).map((item) => item.label));
  const available = (item: StoryItem | undefined) => item !== undefined && !taken.has(item.label);
  let kept = 0;
  const items = current.map((item, index) => {
    if (!isSampleLine(item)) { kept += 1; return item; }
    const next = available(fresh[index]) ? fresh[index] : fresh.find(available);
    if (!next) return item;
    taken.add(next.label);
    return next;
  });
  return { items, kept };
}
