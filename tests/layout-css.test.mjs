import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * jsdom does no layout, so the editor's responsive grid is checked here by
 * replaying the cascade of app/globals.css for one element at a given width.
 * It only understands what this stylesheet uses — width/height media features,
 * `and`, print and reduced motion — and only compares rules whose selectors
 * share a specificity, which is enough for the checks below.
 *
 * The bug it guards: two later rules for `.webapp-workspace` (the editor's base
 * rule and a max-width 1080px rule) overrode the 820px single-column rule, so on
 * every phone the receipt and its Share button sat off-screen.
 */
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function parse(text) {
  const rules = [];
  let i = 0;
  function block(media) {
    while (i < text.length) {
      const open = text.indexOf("{", i);
      const close = text.indexOf("}", i);
      if (close !== -1 && (open === -1 || close < open)) { i = close + 1; return; }
      if (open === -1) { i = text.length; return; }
      const prelude = text.slice(i, open).trim();
      i = open + 1;
      if (prelude.startsWith("@media")) { block([...media, prelude.slice(6).trim()]); continue; }
      if (prelude.startsWith("@")) { skip(); continue; }
      const end = text.indexOf("}", i);
      const body = text.slice(i, end);
      i = end + 1;
      const declarations = body.split(";").map((d) => d.split(":")).filter((p) => p.length > 1)
        .map(([name, ...value]) => [name.trim(), value.join(":").trim()]);
      rules.push({ media, selectors: prelude.split(",").map((s) => s.trim().replace(/\s+/g, " ")), declarations });
    }
  }
  function skip() {
    let depth = 1;
    while (i < text.length && depth) { if (text[i] === "{") depth += 1; else if (text[i] === "}") depth -= 1; i += 1; }
  }
  block([]);
  return rules;
}

const rules = parse(css);

function matches(query, width, height = 800) {
  if (/print|prefers-reduced-motion/.test(query)) return false;
  return [...query.matchAll(/\((min|max)-(width|height)\s*:\s*(\d+)px\)/g)].every(([, bound, axis, px]) => {
    const value = axis === "width" ? width : height;
    return bound === "min" ? value >= Number(px) : value <= Number(px);
  });
}

/** The value that wins for `property` across rules using any of `selectors`, at this width. */
function computed(selectors, property, width) {
  let value;
  for (const rule of rules) {
    if (!rule.selectors.some((s) => selectors.includes(s))) continue;
    if (!rule.media.every((q) => matches(q, width))) continue;
    for (const [name, v] of rule.declarations) if (name === property) value = v;
  }
  return value;
}

// .stories-hero sits on the same element with the same specificity.
const workspace = [".webapp-workspace", ".stories-hero"];
const tracks = (value) => value.replace(/minmax\([^)]*\)/g, "T").trim().split(/\s+/).length;

test("phones and portrait tablets get one column, so the receipt is on screen", () => {
  for (const width of [320, 375, 414, 600, 768, 820]) {
    assert.equal(tracks(computed(workspace, "grid-template-columns", width)), 1, `${width}px`);
  }
});

test("wider screens keep the controls and the canvas side by side", () => {
  for (const width of [821, 900, 1024, 1080, 1280, 1440]) {
    assert.equal(tracks(computed(workspace, "grid-template-columns", width)), 2, `${width}px`);
  }
});

test("stacked, the canvas comes first and its action dock sticks to the screen", () => {
  assert.equal(computed([".webapp-workspace > .webapp-preview"], "order", 375), "-1");
  assert.equal(computed([".webapp-workspace > .webapp-preview"], "order", 1280), undefined);
  assert.equal(computed([".diy-canvas .canvas-dock"], "position", 375), "sticky");
  assert.equal(computed([".diy-canvas .canvas-dock"], "position", 1280), undefined);
});

test("no ancestor of the dock turns into a scroll container that would defeat sticky", () => {
  // `overflow: hidden` (on either axis) makes an element a scroll container; clip does not.
  assert.equal(computed([".single-screen"], "overflow-x", 375), "clip");
  assert.equal(computed([".diy-canvas.webapp-preview"], "overflow", 375), "clip");
});
