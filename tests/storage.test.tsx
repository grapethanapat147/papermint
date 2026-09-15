import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { clearDraft, DRAFT_VERSION, loadDraft, saveDraft } from "../app/lib/storage";
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
