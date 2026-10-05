import { afterEach, describe, expect, test, vi } from "vitest";

import { isFullyVisible, reveal } from "../app/lib/reveal";

const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** A field inside a scrolling column, the way the desktop controls are laid out. */
function setup(field: DOMRect, column: DOMRect) {
  const scroller = document.createElement("div");
  scroller.style.overflowY = "auto";
  const input = document.createElement("input");
  scroller.append(input);
  document.body.append(scroller);
  input.getBoundingClientRect = () => field;
  scroller.getBoundingClientRect = () => column;
  input.scrollIntoView = vi.fn();
  return input;
}

afterEach(() => { document.body.innerHTML = ""; });

describe("reveal", () => {
  test("leaves a field alone when it is already in full view", () => {
    const input = setup(rect(100, 140), rect(0, 600));
    expect(isFullyVisible(input)).toBe(true);
    reveal(input, "center");
    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });

  test("scrolls when the field is below the window, as on a phone", () => {
    const input = setup(rect(1200, 1240), rect(900, 2000));
    reveal(input, "center");
    expect(input.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
  });

  test("scrolls when the window shows it but its scrolling column hides it", () => {
    const input = setup(rect(500, 540), rect(0, 400));
    expect(isFullyVisible(input)).toBe(false);
    reveal(input, "start");
    expect(input.scrollIntoView).toHaveBeenCalled();
  });

  test("jumps instead of animating under reduced motion", () => {
    const input = setup(rect(1200, 1240), rect(900, 2000));
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce") })) as unknown as typeof window.matchMedia;
    try {
      reveal(input, "center");
      expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "center" });
    } finally {
      window.matchMedia = original;
    }
  });
});
