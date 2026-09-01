import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Papermint DIY editor", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="th">/i);
  assert.match(html, /<title>Papermint Stories — Some moments deserve a receipt<\/title>/i);
  assert.match(html, /Story Receipt Maker/);
  assert.match(html, /DIY RECEIPT MAKER/);
  assert.match(html, /DRAG · DROP · CLICK/);
  assert.match(html, /aria-label="Receipt content"/);
  assert.match(html, /aria-label="Interactive receipt canvas"/);
  assert.match(html, /Private on this device/);
  assert.doesNotMatch(html, /Your site is taking shape/);
});

test("keeps the business studio available as a separate route", async () => {
  const response = await render("/studio");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Papermint Studio — Branded receipts<\/title>/i);
  assert.match(html, /A receipt can feel like your brand/);
  assert.match(html, /Create your first receipt/);
  assert.match(html, /Finish &amp; share receipt/);
});
