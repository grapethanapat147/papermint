import assert from "node:assert/strict";
import test from "node:test";

import { accentHex, kinds, photoFilters, stickerAssets, storyLines, totals } from "../app/data/story.ts";
import { makeId, randomStickerTilt } from "../app/lib/random.ts";
import { decodeStory, encodeStory } from "../app/lib/share.ts";

const TONES = ["warm", "funny", "honest"];
const ACCENTS = ["coral", "sage", "ink", "mustard", "lavender", "blue"];

const sampleStory = {
  kind: "trip",
  names: "Mook & Ploy",
  note: "Not perfect. Still ours.",
  tone: "honest",
  decoration: "botanical",
  accent: "sage",
  fontStyle: "mono",
  paperTone: "blush",
  edgeStyle: "rounded",
  textScale: 1.08,
  stickers: [{ id: "a", symbol: "♡", label: "Heart", x: 40, y: 22, size: 26, rotation: -3 }],
  items: [{ id: "i1", label: "Wrong turns that became lore", quantity: "× 5" }],
  total: "It mattered anyway.",
  edition: 824,
};

test("share payload round-trips every field", () => {
  const decoded = decodeStory(encodeStory(sampleStory));
  assert.deepEqual(decoded, sampleStory);
});

test("share payload survives non-latin1 text", () => {
  // btoa() is latin1-only, which is why encodeStory goes through TextEncoder.
  // A refactor that drops that step would throw or mangle these.
  const story = { ...sampleStory, names: "เกรพ & มุก", note: "ยังนับไม่หมด 🧾" };
  assert.deepEqual(decodeStory(encodeStory(story)), story);
});

test("share payload is URL-hash safe", () => {
  const encoded = encodeStory(sampleStory);
  assert.doesNotMatch(encoded, /[+/=]/, "must be base64url with no padding");
  assert.doesNotMatch(encoded, /[#&?]/, "must not break the URL hash");
});

test("decodeStory returns null instead of throwing on bad input", () => {
  for (const bad of ["", "!!!!", "not-base64!", "e30", "%%%"]) {
    assert.doesNotThrow(() => decodeStory(bad));
  }
  assert.equal(decodeStory("not-base64!"), null);
});

test("sticker tilt stays an integer within -6..6", () => {
  for (let n = 0; n < 500; n += 1) {
    const tilt = randomStickerTilt();
    assert.ok(Number.isInteger(tilt), `${tilt} is not an integer`);
    assert.ok(tilt >= -6 && tilt <= 6, `${tilt} is out of range`);
  }
});

test("makeId has the timestamp-plus-entropy shape", () => {
  // Deliberately NOT asserting that a tight loop produces 200 distinct ids.
  // Inside one millisecond the timestamp half is constant, so uniqueness rests
  // on 5 base36 chars (36^5) and the birthday paradox makes a collision show up
  // in roughly 0.03% of such runs — measured at 0.07% over 3000 runs. That is a
  // flaky test, not a real defect: in the app, ids are minted on user actions
  // that are milliseconds apart. What is worth locking down is the shape and
  // the entropy, so a change like slice(2, 4) cannot slip through.
  for (let n = 0; n < 200; n += 1) {
    assert.match(makeId(), /^\d{13}-[a-z0-9]{5}$/);
  }
  const suffixes = new Set(Array.from({ length: 1000 }, () => makeId().split("-")[1]));
  assert.ok(suffixes.size > 900, `only ${suffixes.size}/1000 distinct suffixes — entropy dropped`);
});

test("every story kind has copy for every tone", () => {
  for (const kind of kinds) {
    const byTone = storyLines[kind.id];
    assert.ok(byTone, `storyLines is missing "${kind.id}"`);
    assert.deepEqual(Object.keys(byTone).sort(), [...TONES].sort(), `"${kind.id}" tones`);
    for (const tone of TONES) {
      assert.ok(byTone[tone].length > 0, `"${kind.id}.${tone}" has no lines`);
      for (const line of byTone[tone]) {
        assert.equal(line.length, 2, "each line is a [label, quantity] pair");
        assert.ok(line[0].trim() && line[1].trim(), "neither half may be blank");
      }
    }
  }
});

test("story kinds are unique and fully described", () => {
  assert.equal(new Set(kinds.map((k) => k.id)).size, kinds.length);
  for (const kind of kinds) {
    for (const field of ["label", "icon", "prompt"]) {
      assert.ok(kind[field]?.trim(), `"${kind.id}" is missing ${field}`);
    }
  }
});

test("totals cover every tone", () => {
  assert.deepEqual(Object.keys(totals).sort(), [...TONES].sort());
  for (const tone of TONES) { assert.ok(totals[tone].length > 0); }
});

test("accentHex covers every accent with a real hex colour", () => {
  assert.deepEqual(Object.keys(accentHex).sort(), [...ACCENTS].sort());
  for (const [name, hex] of Object.entries(accentHex)) {
    assert.match(hex, /^#[0-9a-f]{6}$/i, `${name} is not a 6-digit hex colour`);
  }
});

test("photo filters are unique and include an untouched original", () => {
  const ids = photoFilters.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "filter ids must be unique");
  assert.ok(ids.includes("original"));
  assert.equal(photoFilters.find((f) => f.id === "original").css, "", "original must apply no filter");
});

test("sticker assets all carry a symbol and a label", () => {
  assert.ok(stickerAssets.length > 0);
  for (const sticker of stickerAssets) {
    assert.ok(sticker.symbol?.trim(), "sticker needs a symbol");
    assert.ok(sticker.label?.trim(), "sticker needs a label");
  }
});
