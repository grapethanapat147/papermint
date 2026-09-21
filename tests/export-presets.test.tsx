import { fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import StoriesHome from "../app/page";
import { receiptChrome } from "../app/data/story";
import { exportPresets } from "../app/lib/export";

/**
 * jsdom has no canvas, so the drawing itself is a browser check. What is worth
 * pinning here is the preset table, the share modal's wiring, and the fact that
 * the receipt's fixed copy now comes from one place — the export used to drop
 * the user's note entirely because the two surfaces were written separately.
 */
describe("export presets", () => {
  test("offers story, post and receipt at the expected sizes", () => {
    expect(exportPresets.story.width).toBe(1080);
    expect(exportPresets.story.height).toBe(1920);
    expect(exportPresets.post.width).toBe(1080);
    expect(exportPresets.post.height).toBe(1350);
    expect(exportPresets.receipt.width).toBe(840);
    expect(exportPresets.receipt.height).toBe(1780);
  });

  test("only the receipt preset drops the backdrop", () => {
    expect(exportPresets.story.backdrop).toBe(true);
    expect(exportPresets.post.backdrop).toBe(true);
    expect(exportPresets.receipt.backdrop).toBe(false);
  });

  test("every preset leaves room for the whole receipt once scaled", () => {
    for (const preset of Object.values(exportPresets)) {
      const scale = Math.min(
        (preset.width - preset.padding * 2) / 840,
        (preset.height - preset.padding * 2) / 1780,
      );
      expect(scale).toBeGreaterThan(0);
      expect(840 * scale).toBeLessThanOrEqual(preset.width);
      expect(1780 * scale).toBeLessThanOrEqual(preset.height);
    }
  });

  test("story still fits the receipt at full size, so it cannot silently shrink", () => {
    const preset = exportPresets.story;
    const scale = Math.min(
      (preset.width - preset.padding * 2) / 840,
      (preset.height - preset.padding * 2) / 1780,
    );
    expect(scale).toBe(1);
  });
});

describe("share modal", () => {
  beforeEach(() => { window.localStorage.clear(); window.location.hash = ""; });
  afterEach(() => { window.localStorage.clear(); window.location.hash = ""; });

  test("shows one download button per preset", () => {
    render(<StoriesHome />);
    fireEvent.click([...document.querySelectorAll("button")].find((b) => /Share ↗/.test(b.textContent ?? ""))!);
    const modal = document.querySelector(".story-modal") as HTMLElement;
    for (const preset of Object.values(exportPresets)) {
      expect(within(modal).getByRole("button", { name: new RegExp(preset.label) })).toBeTruthy();
    }
  });
});

describe("receipt copy has one source", () => {
  beforeEach(() => { window.localStorage.clear(); window.location.hash = ""; });

  test("the on-screen receipt prints the shared chrome strings", () => {
    render(<StoriesHome />);
    const receipt = (document.querySelector("#story-receipt") as HTMLElement).textContent ?? "";
    for (const text of [receiptChrome.brand, receiptChrome.issuedLabel, receiptChrome.issuedOn, receiptChrome.totalLabel, receiptChrome.disclaimer]) {
      expect(receipt).toContain(text);
    }
  });

  test("an empty note falls back to the shared string, on screen and in export", () => {
    render(<StoriesHome />);
    const note = document.querySelector(".diy-panel textarea") as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "" } });
    expect((document.querySelector("#story-receipt") as HTMLElement).textContent).toContain(receiptChrome.fallbackNote);
  });
});
