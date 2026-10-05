import { describe, expect, test } from "vitest";

import { kinds, newLine, storyLines } from "../app/data/story";
import { builtInTemplates } from "../app/data/templates";
import { isSampleLine, isSampleName, remixItems } from "../app/lib/remix";

const line = (label: string, quantity: string, id = label) => ({ id, label, quantity });
const [seedLabel, seedQuantity] = storyLines.friendship.warm[0];

describe("what counts as the app's words", () => {
  test("seeded lines, template lines and the + Add placeholder are samples", () => {
    expect(isSampleLine(line(seedLabel, seedQuantity))).toBe(true);
    const fromTemplate = builtInTemplates[1].items[1];
    expect(isSampleLine(line(fromTemplate.label, fromTemplate.quantity))).toBe(true);
    expect(isSampleLine(line(newLine.label, newLine.quantity))).toBe(true);
  });

  test("editing either the label or the quantity makes a line theirs", () => {
    expect(isSampleLine(line(`${seedLabel}!`, seedQuantity))).toBe(false);
    expect(isSampleLine(line(seedLabel, "× 3"))).toBe(false);
    expect(isSampleLine(line("ข้าวมันไก่เจ้าประจำ", newLine.quantity))).toBe(false);
  });

  test("a subject is theirs once it is neither empty nor an example prompt", () => {
    for (const entry of kinds) expect(isSampleName(entry.prompt)).toBe(true);
    expect(isSampleName("")).toBe(true);
    expect(isSampleName("   ")).toBe(true);
    expect(isSampleName("Grape & Nam")).toBe(false);
    // Close to a prompt is still theirs: they started from it and changed it.
    expect(isSampleName(`${kinds[0].prompt} forever`)).toBe(false);
  });
});

describe("remixItems", () => {
  const fresh = storyLines.trip.funny.map(([label, quantity]) => line(label, quantity));

  test("keeps their lines in place and re-rolls the rest", () => {
    const mine = line("Our first concert together", "× 1");
    const current = [line(seedLabel, seedQuantity), mine, line(newLine.label, newLine.quantity)];
    const { items, kept } = remixItems(current, fresh);
    expect(kept).toBe(1);
    expect(items[1]).toBe(mine);
    // Each sample row takes the fresh line at its own position; nothing shuffles.
    expect(items[0].label).toBe(fresh[0].label);
    expect(items[2].label).toBe(fresh[2].label);
    expect(items).toHaveLength(3);
  });

  test("an untouched receipt is fully re-rolled, as before", () => {
    const current = storyLines.friendship.warm.map(([label, quantity]) => line(label, quantity));
    const { items, kept } = remixItems(current, fresh);
    expect(kept).toBe(0);
    expect(items.map((item) => item.label)).toEqual(fresh.map((item) => item.label));
  });

  test("never adds a fresh line that duplicates one of theirs", () => {
    const theirs = line(fresh[0].label, "× 99");
    const { items } = remixItems([theirs, line(seedLabel, seedQuantity)], fresh);
    expect(items.map((item) => item.label)).toEqual([fresh[0].label, fresh[1].label]);
  });

  test("when fresh lines run out, the remaining sample rows stay as they were", () => {
    const current = Array.from({ length: 6 }, (_, i) => line(seedLabel, seedQuantity, `row-${i}`));
    const { items } = remixItems(current, fresh);
    expect(items.slice(0, 4).map((item) => item.label)).toEqual(fresh.map((item) => item.label));
    expect(items[4]).toBe(current[4]);
    expect(items[5]).toBe(current[5]);
  });
});
