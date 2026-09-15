import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

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
