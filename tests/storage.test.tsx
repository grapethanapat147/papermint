import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { clearDraft, DRAFT_VERSION, loadDraft, loadTemplates, MAX_SAVED_TEMPLATES, saveDraft, saveTemplates } from "../app/lib/storage";
import type { ReceiptTemplate } from "../app/types";
import type { SharedStory } from "../app/types";

const KEY = "papermint:draft";

const story: SharedStory = {
  kind: "trip", names: "เกรพ & มุก", note: "Not perfect. Still ours.", tone: "warm",
  stickers: [{ id: "s1", symbol: "♡", label: "Heart", x: 40, y: 22, size: 26, rotation: -3 }],
  items: [{ id: "i1", label: "Wrong turns that became lore", quantity: "× 5" }],
  total: "Still adding up.", edition: 824,
};

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); });

describe("draft storage", () => {
  test("round-trips a draft", () => {
    expect(saveDraft(story)).toBe(true);
    expect(loadDraft()).toEqual(story);
  });

  test("stores a version and a timestamp alongside the story", () => {
    saveDraft(story);
    const stored = JSON.parse(window.localStorage.getItem(KEY) as string);
    expect(stored.version).toBe(DRAFT_VERSION);
    expect(typeof stored.savedAt).toBe("number");
  });

  test("ignores a draft written by another version", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ version: DRAFT_VERSION + 1, savedAt: Date.now(), story }));
    expect(loadDraft()).toBeNull();
  });

  test("ignores unparseable or malformed entries instead of throwing", () => {
    for (const bad of ["not json", "{}", '{"version":1}', JSON.stringify({ version: DRAFT_VERSION, story: { kind: "trip" } })]) {
      window.localStorage.setItem(KEY, bad);
      expect(() => loadDraft()).not.toThrow();
      expect(loadDraft()).toBeNull();
    }
  });

  test("returns null when there is nothing saved", () => {
    expect(loadDraft()).toBeNull();
  });

  test("clearDraft removes the entry", () => {
    saveDraft(story);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  test("a full quota reports failure and drops the stale entry, without throwing", () => {
    saveDraft(story);
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => saveDraft(story)).not.toThrow();
    expect(saveDraft(story)).toBe(false);
    setItem.mockRestore();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  test("survives storage being unavailable entirely", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => loadDraft()).not.toThrow();
    expect(loadDraft()).toBeNull();
  });

  test("never writes photo data", () => {
    // photoData is not part of SharedStory, but guard the invariant explicitly:
    // anything that starts smuggling a data URL in here would blow the quota.
    saveDraft({ ...story, names: "no photo here" });
    expect(window.localStorage.getItem(KEY)).not.toContain("data:image");
  });
});

describe("template storage", () => {
  const KEY = "papermint:templates";
  const make = (n: number): ReceiptTemplate => ({
    id: `t${n}`, name: `Template ${n}`,
    kind: "trip", tone: "warm", decoration: "classic", accent: "coral",
    fontStyle: "editorial", paperTone: "cream", edgeStyle: "torn", textScale: 1.08,
    note: "n", total: "t", items: [{ label: "a line", quantity: "× 1" }],
  });

  test("round-trips saved templates", () => {
    const templates = [make(1), make(2)];
    expect(saveTemplates(templates)).toBe(true);
    expect(loadTemplates()).toEqual(templates);
  });

  test("persists at most the cap, however many are handed in", () => {
    saveTemplates(Array.from({ length: MAX_SAVED_TEMPLATES + 8 }, (_, n) => make(n)));
    expect(loadTemplates().length).toBe(MAX_SAVED_TEMPLATES);
  });

  test("drops a list written by another version", () => {
    // valid JSON, wrong version — the parse succeeds, so only the version check
    // can catch this one
    window.localStorage.setItem(KEY, JSON.stringify({ version: DRAFT_VERSION + 1, templates: [make(1)] }));
    expect(loadTemplates()).toEqual([]);
  });

  test("drops entries that are not shaped like templates", () => {
    window.localStorage.setItem(KEY, JSON.stringify({
      version: DRAFT_VERSION,
      templates: [make(1), { id: "x" }, null, { name: "no items", id: "y" }],
    }));
    expect(loadTemplates().map((template) => template.id)).toEqual(["t1"]);
  });

  test("never returns a built-in, so the shipped list cannot be shadowed", () => {
    window.localStorage.setItem(KEY, JSON.stringify({
      version: DRAFT_VERSION,
      templates: [{ ...make(1), builtIn: true }, make(2)],
    }));
    expect(loadTemplates().map((template) => template.id)).toEqual(["t2"]);
  });

  test("a full quota reports failure instead of throwing", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() => saveTemplates([make(1)])).not.toThrow();
    expect(saveTemplates([make(1)])).toBe(false);
    setItem.mockRestore();
  });
});
