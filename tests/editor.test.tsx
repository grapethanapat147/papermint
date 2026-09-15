import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import StoriesHome from "../app/page";
import { encodeStory } from "../app/lib/share";
import { saveDraft } from "../app/lib/storage";

/**
 * Characterisation tests: they describe what the editor does TODAY, so that
 * moving the 32 useState calls into hooks and splitting the JSX into components
 * can be proved behaviour-preserving. They deliberately assert user-visible
 * results, not internal state shape, so they survive the refactor.
 *
 * Canvas is not implemented in jsdom, so PNG export is out of scope here and
 * stays a browser check.
 */

const receipt = () => document.querySelector("#story-receipt") as HTMLElement;
const panel = (label: string) => document.querySelector(`.diy-panel[aria-label="${label}"]`);
/**
 * Scoped to the tool tab bar on purpose. screen.getByRole builds the whole
 * accessibility tree, and this page renders enough buttons that doing it three
 * times in one test ran for seconds and intermittently blew vitest's 5s timeout.
 */
const tab = (label: string) => {
  const bar = document.querySelector('nav[aria-label="Design tools"]') as HTMLElement;
  const found = [...bar.querySelectorAll("button")].find((b) => b.textContent?.includes(label));
  if (!found) throw new Error(`no "${label}" tool tab`);
  return found;
};

beforeEach(() => { window.location.hash = ""; window.localStorage.clear(); });
afterEach(() => { window.location.hash = ""; window.localStorage.clear(); });

describe("tool panels", () => {
  test("content is the panel shown first", () => {
    render(<StoriesHome />);
    expect(panel("Receipt content")).toBeTruthy();
    expect(panel("Receipt style")).toBeNull();
  });

  test("each tab swaps in its own panel", () => {
    render(<StoriesHome />);
    fireEvent.click(tab("Style"));
    expect(panel("Receipt style")).toBeTruthy();
    expect(panel("Receipt content")).toBeNull();

    fireEvent.click(tab("Stickers"));
    expect(panel("Sticker tools")).toBeTruthy();

    fireEvent.click(tab("Content"));
    expect(panel("Receipt content")).toBeTruthy();
  });
});

describe("story kind", () => {
  test("choosing a kind retitles the receipt and reseeds the name", () => {
    render(<StoriesHome />);
    expect(receipt().textContent).toContain("Our Friendship");

    fireEvent.click(screen.getByRole("button", { name: /Our Trip/i }));
    expect(receipt().textContent).toContain("Our Trip");
    expect(receipt().textContent).toContain("Chiang Mai");
  });
});

describe("line items", () => {
  const rows = () => receipt().querySelectorAll(".life-items > div");

  test("add appends a row to the receipt", () => {
    render(<StoriesHome />);
    const before = rows().length;
    fireEvent.click(within(panel("Receipt content") as HTMLElement).getByRole("button", { name: /Add/i }));
    expect(rows().length).toBe(before + 1);
    expect(receipt().textContent).toContain("A new memory");
  });

  test("editing a row's label updates the receipt", () => {
    render(<StoriesHome />);
    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Songs on repeat" } });
    expect(receipt().textContent).toContain("Songs on repeat");
  });

  test("remove drops the row", () => {
    render(<StoriesHome />);
    const before = rows().length;
    const remove = within(panel("Receipt content") as HTMLElement).getAllByRole("button", { name: /Remove line item/i })[0];
    fireEvent.click(remove);
    expect(rows().length).toBe(before - 1);
  });
});

describe("stickers", () => {
  const onCanvas = () => document.querySelectorAll(".diy-sticker");

  const openStickers = () => {
    fireEvent.click(tab("Stickers"));
    return panel("Sticker tools") as HTMLElement;
  };

  test("adding one puts it on the canvas with a tilt in range", () => {
    render(<StoriesHome />);
    const tools = openStickers();
    fireEvent.click(within(tools).getByRole("button", { name: /Heart/i }));

    expect(onCanvas().length).toBe(1);
    const transform = (onCanvas()[0] as HTMLElement).style.transform;
    const tilt = Number(/rotate\((-?[\d.]+)deg\)/.exec(transform)?.[1]);
    expect(Number.isInteger(tilt)).toBe(true);
    expect(tilt).toBeGreaterThanOrEqual(-6);
    expect(tilt).toBeLessThanOrEqual(6);
  });

  test("each add stacks another sticker", () => {
    render(<StoriesHome />);
    const tools = openStickers();
    const heart = within(tools).getByRole("button", { name: /Heart/i });
    fireEvent.click(heart);
    fireEvent.click(heart);
    fireEvent.click(heart);
    expect(onCanvas().length).toBe(3);
  });

  test("the newest sticker is the selected one", () => {
    render(<StoriesHome />);
    const tools = openStickers();
    fireEvent.click(within(tools).getByRole("button", { name: /Heart/i }));
    fireEvent.click(within(tools).getByRole("button", { name: /Spark/i }));

    const selected = document.querySelectorAll(".diy-sticker.selected");
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe("✦");
  });
});

describe("shared story in the URL hash", () => {
  const shared = {
    kind: "era" as const,
    names: "เกรพ & มุก",
    note: "Lint is green.",
    tone: "honest" as const,
    stickers: [
      { id: "s1", symbol: "♡", label: "Heart", x: 40, y: 22, size: 26, rotation: -3 },
      { id: "s2", symbol: "✦", label: "Spark", x: 60, y: 44, size: 26, rotation: 4 },
    ],
    items: [{ id: "i1", label: "Verified the share link", quantity: "× 1" }],
    total: "PRICELESS-4242",
    edition: 4242,
  };

  test("hydrates the draft from #s= on mount", async () => {
    window.location.hash = `#s=${encodeStory(shared)}`;
    render(<StoriesHome />);

    await waitFor(() => expect(receipt().textContent).toContain("เกรพ & มุก"));
    expect(receipt().textContent).toContain("Verified the share link");
    expect(receipt().textContent).toContain("PRICELESS-4242");
    expect(receipt().textContent).toContain("4242");
    expect(document.querySelectorAll(".diy-sticker").length).toBe(2);
  });

  test("shows the invite banner only for a shared story", async () => {
    window.location.hash = `#s=${encodeStory(shared)}`;
    const { unmount } = render(<StoriesHome />);
    await waitFor(() => expect(document.querySelector(".invite-banner")).toBeTruthy());
    unmount();

    window.location.hash = "";
    render(<StoriesHome />);
    expect(document.querySelector(".invite-banner")).toBeNull();
  });

  test("a corrupt payload is ignored rather than crashing", () => {
    window.location.hash = "#s=not-a-real-payload!!";
    render(<StoriesHome />);
    expect(receipt().textContent).toContain("Our Friendship");
    expect(document.querySelector(".invite-banner")).toBeNull();
  });
});

describe("autosave and undo", () => {
  const savedStory = {
    kind: "work" as const,
    names: "Launch week crew",
    note: "Somehow survived.",
    tone: "funny" as const,
    stickers: [],
    items: [{ id: "i1", label: "Meetings that could be texts", quantity: "× 11" }],
    total: "Emotionally over budget.",
    edition: 901,
  };

  test("restores a saved draft on a bare URL, without the invite banner", async () => {
    saveDraft(savedStory);
    render(<StoriesHome />);
    await waitFor(() => expect(receipt().textContent).toContain("Launch week crew"));
    expect(receipt().textContent).toContain("Meetings that could be texts");
    expect(document.querySelector(".invite-banner")).toBeNull();
    // restoring is not an edit — there must be nothing to undo yet
    expect((screen.getByRole("button", { name: /^Undo$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("editing the receipt writes an autosave", async () => {
    render(<StoriesHome />);
    expect(window.localStorage.getItem("papermint:draft")).toBeNull();

    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Songs on repeat" } });

    await waitFor(
      () => expect(window.localStorage.getItem("papermint:draft")).toContain("Songs on repeat"),
      { timeout: 3000 },
    );
  });

  test("an autosave never carries photo data", async () => {
    render(<StoriesHome />);
    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Songs on repeat" } });
    await waitFor(() => expect(window.localStorage.getItem("papermint:draft")).toBeTruthy(), { timeout: 3000 });
    expect(window.localStorage.getItem("papermint:draft")).not.toContain("data:image");
  });

  test("a shared link beats a saved draft", async () => {
    saveDraft(savedStory);
    window.location.hash = `#s=${encodeStory({ ...savedStory, names: "From the link", edition: 111 })}`;
    render(<StoriesHome />);
    await waitFor(() => expect(receipt().textContent).toContain("From the link"));
    expect(receipt().textContent).not.toContain("Launch week crew");
    expect(document.querySelector(".invite-banner")).toBeTruthy();
  });

  test("viewing a shared story leaves this device's draft untouched", async () => {
    saveDraft(savedStory);
    window.location.hash = `#s=${encodeStory({ ...savedStory, names: "SOMEONE ELSE", edition: 5 })}`;
    render(<StoriesHome />);
    await waitFor(() => expect(receipt().textContent).toContain("SOMEONE ELSE"));

    // well past the 600ms autosave window
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const stored = JSON.parse(window.localStorage.getItem("papermint:draft") as string);
    expect(stored.story.names).toBe(savedStory.names);
    expect(stored.story.names).not.toBe("SOMEONE ELSE");
  });

  test("ctrl+z reverses an edit once it has settled", async () => {
    render(<StoriesHome />);
    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    const original = input.value;

    fireEvent.change(input, { target: { value: "Songs on repeat" } });
    expect(receipt().textContent).toContain("Songs on repeat");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(receipt().textContent).toContain(original));
    expect(receipt().textContent).not.toContain("Songs on repeat");
  });

  test("shift+ctrl+z puts the edit back", async () => {
    render(<StoriesHome />);
    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Songs on repeat" } });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(receipt().textContent).not.toContain("Songs on repeat"));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(receipt().textContent).toContain("Songs on repeat"));
  });

  test("ctrl+z inside a text field is left to the browser", async () => {
    render(<StoriesHome />);
    const input = (panel("Receipt content") as HTMLElement).querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Songs on repeat" } });

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(receipt().textContent).toContain("Songs on repeat");
  });
});

describe("reordering line items", () => {
  const labels = () =>
    [...(panel("Receipt content") as HTMLElement).querySelectorAll<HTMLInputElement>('input[aria-label="Line item"]')]
      .map((input) => input.value);
  const grips = () =>
    [...(panel("Receipt content") as HTMLElement).querySelectorAll<HTMLButtonElement>(".drag-grip")];

  let restoreHitTest: (() => void) | null = null;
  afterEach(() => { restoreHitTest?.(); restoreHitTest = null; });

  test("the grip is a real control, not an aria-hidden decoration", () => {
    render(<StoriesHome />);
    const grip = grips()[0];
    expect(grip.tagName).toBe("BUTTON");
    expect(grip.getAttribute("aria-label")).toMatch(/reorder/i);
    expect(grip.getAttribute("aria-hidden")).toBeNull();
  });

  test("arrow keys move a row, which drag-and-drop never allowed", () => {
    render(<StoriesHome />);
    const before = labels();

    fireEvent.keyDown(grips()[0], { key: "ArrowDown" });
    expect(labels()).toEqual([before[1], before[0], before[2], before[3]]);

    fireEvent.keyDown(grips()[1], { key: "ArrowUp" });
    expect(labels()).toEqual(before);
  });

  test("arrow keys stop at the ends instead of wrapping", () => {
    render(<StoriesHome />);
    const before = labels();
    fireEvent.keyDown(grips()[0], { key: "ArrowUp" });
    expect(labels()).toEqual(before);
    fireEvent.keyDown(grips()[before.length - 1], { key: "ArrowDown" });
    expect(labels()).toEqual(before);
  });

  test("a pointer drag reorders, so a finger works and not just a mouse", () => {
    render(<StoriesHome />);
    const before = labels();
    const rows = [...(panel("Receipt content") as HTMLElement).querySelectorAll("[data-item-index]")];
    const grip = grips()[0];

    // jsdom has no layout and does not implement elementFromPoint at all,
    // so point-hit testing is stubbed to the third row
    const original = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    (document as unknown as { elementFromPoint: unknown }).elementFromPoint = () => rows[2] as Element;
    restoreHitTest = () => {
      if (original) Object.defineProperty(document, "elementFromPoint", original);
      else delete (document as unknown as { elementFromPoint?: unknown }).elementFromPoint;
    };
    grip.setPointerCapture = vi.fn();
    grip.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(grip, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerMove(grip, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 200 });
    fireEvent.pointerUp(grip, { pointerId: 1, pointerType: "touch" });

    expect(labels()).toEqual([before[1], before[2], before[0], before[3]]);
    expect(grip.setPointerCapture).toHaveBeenCalledWith(1);
  });

  test("rows no longer rely on HTML5 drag-and-drop, which touch never fires", () => {
    render(<StoriesHome />);
    const rows = [...(panel("Receipt content") as HTMLElement).querySelectorAll(".diy-item-row")];
    for (const row of rows) {
      expect(row.getAttribute("draggable")).toBeNull();
    }
  });

  test("rows carry a hydration-safe index, not a random id", () => {
    render(<StoriesHome />);
    const rows = [...(panel("Receipt content") as HTMLElement).querySelectorAll(".diy-item-row")];
    rows.forEach((row, index) => {
      // ids are Date.now()+Math.random(), so an id in the DOM desyncs hydration
      expect(row.getAttribute("data-item-id")).toBeNull();
      expect(row.getAttribute("data-item-index")).toBe(String(index));
    });
  });
});

describe("sticker dragging", () => {
  test("captures the pointer and moves from events on the sticker itself", () => {
    render(<StoriesHome />);
    fireEvent.click(tab("Stickers"));
    fireEvent.click(within(panel("Sticker tools") as HTMLElement).getByRole("button", { name: /Heart/i }));

    const sticker = document.querySelector(".diy-sticker") as HTMLElement;
    const receipt = document.querySelector("#story-receipt") as HTMLElement;
    sticker.setPointerCapture = vi.fn();
    sticker.releasePointerCapture = vi.fn();
    // jsdom reports a zero-sized box; give the receipt a real one so the
    // percentage maths has something to work with
    receipt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.pointerDown(sticker, { pointerId: 3, pointerType: "touch" });
    expect(sticker.setPointerCapture).toHaveBeenCalledWith(3);

    // the move is dispatched on the sticker, not the receipt — that is what keeps
    // the drag alive once a finger leaves the receipt
    fireEvent.pointerMove(sticker, { pointerId: 3, pointerType: "touch", clientX: 40, clientY: 200 });
    const moved = document.querySelector(".diy-sticker") as HTMLElement;
    expect(moved.style.left).toBe("20%");
    expect(moved.style.top).toBe("50%");

    fireEvent.pointerUp(sticker, { pointerId: 3, pointerType: "touch" });
    expect(sticker.releasePointerCapture).toHaveBeenCalledWith(3);
  });

  test("a capture that throws still leaves a usable drag", () => {
    render(<StoriesHome />);
    fireEvent.click(tab("Stickers"));
    fireEvent.click(within(panel("Sticker tools") as HTMLElement).getByRole("button", { name: /Heart/i }));

    const sticker = document.querySelector(".diy-sticker") as HTMLElement;
    const receipt = document.querySelector("#story-receipt") as HTMLElement;
    receipt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
    // setPointerCapture throws NotFoundError for a pointer the browser no longer
    // tracks. Without the guard that exception escapes the handler and the drag
    // is dead; with it, the drag simply runs uncaptured.
    sticker.setPointerCapture = vi.fn(() => { throw new DOMException("no active pointer", "NotFoundError"); });

    fireEvent.pointerDown(sticker, { pointerId: 9, pointerType: "touch" });
    fireEvent.pointerMove(sticker, { pointerId: 9, pointerType: "touch", clientX: 40, clientY: 200 });

    const moved = document.querySelector(".diy-sticker") as HTMLElement;
    expect(moved.style.left).toBe("20%");
    expect(moved.style.top).toBe("50%");
  });
});

describe("two-finger sticker gestures", () => {
  const addHeart = () => {
    fireEvent.click(tab("Stickers"));
    fireEvent.click(within(panel("Sticker tools") as HTMLElement).getByRole("button", { name: /Heart/i }));
    const sticker = document.querySelector(".diy-sticker") as HTMLElement;
    sticker.setPointerCapture = vi.fn();
    sticker.releasePointerCapture = vi.fn();
    return sticker;
  };
  const sizePx = () => Number(/([\d.]+)px/.exec((document.querySelector(".diy-sticker") as HTMLElement).style.fontSize)?.[1]);
  const rotationDeg = () => Number(/rotate\((-?[\d.]+)deg\)/.exec((document.querySelector(".diy-sticker") as HTMLElement).style.transform)?.[1]);

  test("spreading two fingers grows the sticker", () => {
    render(<StoriesHome />);
    const sticker = addHeart();
    const before = sizePx();
    // stickers land with a random tilt, so compare against where this one started
    const tiltBefore = rotationDeg();

    fireEvent.pointerDown(sticker, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerDown(sticker, { pointerId: 2, pointerType: "touch", clientX: 140, clientY: 100 });
    // same axis, double the gap: size doubles, rotation unchanged
    fireEvent.pointerMove(sticker, { pointerId: 2, pointerType: "touch", clientX: 180, clientY: 100 });

    expect(sizePx()).toBe(Math.min(48, before * 2));
    expect(rotationDeg()).toBe(tiltBefore);
  });

  test("pinching in shrinks it, clamped to the slider's minimum", () => {
    render(<StoriesHome />);
    const sticker = addHeart();

    fireEvent.pointerDown(sticker, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerDown(sticker, { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 100 });
    fireEvent.pointerMove(sticker, { pointerId: 2, pointerType: "touch", clientX: 101, clientY: 100 });

    expect(sizePx()).toBe(12);
  });

  test("twisting two fingers rotates it, clamped to the slider's range", () => {
    render(<StoriesHome />);
    const sticker = addHeart();

    fireEvent.pointerDown(sticker, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerDown(sticker, { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 100 });
    // swing the second finger a quarter turn; the clamp holds it at 30
    fireEvent.pointerMove(sticker, { pointerId: 2, pointerType: "touch", clientX: 100, clientY: 200 });

    expect(rotationDeg()).toBe(30);
    expect(rotationDeg()).toBeLessThanOrEqual(30);
  });

  test("a second finger suspends the one-finger reposition", () => {
    render(<StoriesHome />);
    addHeart();
    const receipt = document.querySelector("#story-receipt") as HTMLElement;
    receipt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });

    // re-query before each event: React re-renders the layer between them
    const live = () => document.querySelector(".diy-sticker") as HTMLElement;
    const prep = () => { const el = live(); el.setPointerCapture = vi.fn(); el.releasePointerCapture = vi.fn(); return el; };

    fireEvent.pointerDown(prep(), { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerDown(prep(), { pointerId: 2, pointerType: "touch", clientX: 140, clientY: 100 });
    const before = live().style.left;

    fireEvent.pointerMove(prep(), { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 300 });
    expect(live().style.left).toBe(before);

    // lifting one finger hands control back to dragging
    fireEvent.pointerUp(prep(), { pointerId: 2, pointerType: "touch" });
    fireEvent.pointerMove(prep(), { pointerId: 1, pointerType: "touch", clientX: 20, clientY: 300 });
    expect(live().style.left).toBe("10%");
  });
});
