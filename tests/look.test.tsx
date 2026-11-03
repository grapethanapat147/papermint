import { afterEach, describe, expect, test, vi } from "vitest";

import { kinds } from "../app/data/story";
import { builtInTemplates } from "../app/data/templates";
import { deliverPng } from "../app/lib/export";
import { decodeLook, encodeLook, lookOptions, lookOrder, lookUrl, storyFromLook, type Look } from "../app/lib/look";
import { QR_QUIET_ZONE, qrPath } from "../app/lib/qr";
import type { SharedStory } from "../app/types";

const look: Look = {
  kind: "trip", tone: "funny", decoration: "botanical", accent: "sage",
  fontStyle: "rounded", paperTone: "sage", edgeStyle: "rounded", textScale: 1.1,
};

describe("look links", () => {
  test("round-trip through the compact form", () => {
    expect(encodeLook(look)).toBe("tfbsrsr110");
    expect(decodeLook(encodeLook(look))).toEqual(look);
  });

  test("anything unknown, missing or out of range is rejected whole", () => {
    expect(decodeLook("tfbsrsr")).toBeNull();
    expect(decodeLook("tfbzrsr110")).toBeNull(); // no accent starts with z
    expect(decodeLook("tfbsrsr500")).toBeNull();
    expect(decodeLook("tfbsrsr80")).toBeNull();
    expect(decodeLook("tfbsrsr1e2")).toBeNull();
    expect(decodeLook("tfbsrsrs110")).toBeNull();
    expect(decodeLook("<script>110")).toBeNull();
    expect(decodeLook("")).toBeNull();
  });

  test("every option is reachable: first letters are unique within each set", () => {
    for (const key of lookOrder) {
      const letters = (lookOptions[key] as readonly string[]).map((option) => option[0]);
      expect(new Set(letters).size, key).toBe(letters.length);
    }
  });

  test("a production link makes a small QR, so it scans off a phone screen", () => {
    const url = lookUrl("https://papermint-receipt-studio.grapetnp147.chatgpt.site/", look);
    // Version 5 is 37 modules — the size of the handoff QR, verified to scan at 112px.
    expect(qrPath(url).size - QR_QUIET_ZONE * 2).toBeLessThanOrEqual(37);
  });
});

describe("storyFromLook", () => {
  const saved: SharedStory = {
    kind: "friendship", names: "Grape & Nam", note: "Our note.", tone: "warm", decoration: "classic",
    accent: "coral", fontStyle: "editorial", paperTone: "cream", edgeStyle: "torn", textScale: 1,
    stickers: [], items: [{ id: "a", label: "Our first concert", quantity: "× 1" }], total: "Ours.", edition: 9,
  };

  test("a draft already on this device keeps every word; only the look changes", () => {
    const story = storyFromLook(look, saved);
    expect(story).toMatchObject({ kind: "friendship", tone: "warm", names: "Grape & Nam", note: "Our note.", items: saved.items, total: "Ours.", edition: 9 });
    expect(story).toMatchObject({ decoration: "botanical", accent: "sage", fontStyle: "rounded", paperTone: "sage", edgeStyle: "rounded", textScale: 1.1 });
  });

  test("with no draft, it starts from that kind's template, with an example subject and no stickers", () => {
    const story = storyFromLook(look, null);
    const template = builtInTemplates.find((entry) => entry.kind === "trip")!;
    expect(story.kind).toBe("trip");
    expect(story.names).toBe(kinds.find((entry) => entry.id === "trip")!.prompt);
    expect(story.items.map((item) => item.label)).toEqual(template.items.map((item) => item.label));
    expect(story.stickers).toEqual([]);
    expect(story.decoration).toBe("botanical");
  });
});

describe("deliverPng", () => {
  const blob = new Blob(["png"], { type: "image/png" });
  const originals = { share: navigator.share, canShare: navigator.canShare, matchMedia: window.matchMedia };
  let clicked: string[] = [];

  function device({ phone, share }: { phone: boolean; share?: () => Promise<void> }) {
    window.matchMedia = ((query: string) => ({ matches: phone && query.includes("coarse") })) as unknown as typeof window.matchMedia;
    Object.assign(navigator, { canShare: () => true, share: vi.fn(share ?? (() => Promise.resolve())) });
    URL.createObjectURL = () => "blob:test";
    URL.revokeObjectURL = () => {};
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
  }

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(navigator, { share: originals.share, canShare: originals.canShare });
    window.matchMedia = originals.matchMedia;
  });

  test("on a phone it opens the share sheet with the image itself", async () => {
    device({ phone: true });
    await deliverPng(blob, "a.png");
    const call = (navigator.share as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.files[0].name).toBe("a.png");
    expect(call.files[0].type).toBe("image/png");
    expect(clicked).toEqual([]);
  });

  test("cancelling the sheet is not an error and downloads nothing", async () => {
    device({ phone: true, share: () => Promise.reject(Object.assign(new Error("x"), { name: "AbortError" })) });
    await deliverPng(blob, "a.png");
    expect(clicked).toEqual([]);
  });

  test("if the share is refused, the image still downloads", async () => {
    device({ phone: true, share: () => Promise.reject(Object.assign(new Error("x"), { name: "NotAllowedError" })) });
    await deliverPng(blob, "a.png");
    expect(clicked).toEqual(["a.png"]);
  });

  test("on a desktop it downloads, even where files could be shared", async () => {
    device({ phone: false });
    await deliverPng(blob, "a.png");
    expect(navigator.share).not.toHaveBeenCalled();
    expect(clicked).toEqual(["a.png"]);
  });
});
