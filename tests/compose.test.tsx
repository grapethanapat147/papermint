import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test, vi } from "vitest";

import { handleCompose } from "../app/lib/compose-server";
import { COMPOSE_MODEL, MAX_DESCRIPTION, isComposeRequest, parseComposed } from "../app/lib/compose-shared";
import { COMPOSE_LIMITS, takeComposeSlot, visitorId } from "../app/lib/rate-limit";

const good = {
  names: "แก๊งเชียงใหม่",
  items: [
    { label: "ฝนตกทุกวัน", quantity: "× 3" },
    { label: "ข้าวซอยที่กินไป", quantity: "7" },
    { label: "มุกที่ขำทั้งทริป", quantity: "× ∞" },
    { label: "รูปที่ไม่กล้าโพสต์", quantity: "× 42" },
  ],
  total: "คุ้มทุกหยดฝน",
  note: "เปียกแต่ไม่เคยเหงา",
  stamp: "สายลุย ไม่ดูฟ้า",
};

describe("parseComposed", () => {
  test("accepts a good draft and tidies it to what the receipt can print", () => {
    const parsed = parseComposed(JSON.stringify({ ...good, names: "x".repeat(60), stamp: "rain chasers", extra: "ignored" }))!;
    expect(parsed.names).toHaveLength(38);
    expect(parsed.items[1].quantity).toBe("× 7");
    expect(parsed.stamp).toBe("RAIN CHASERS");
    expect(parsed).not.toHaveProperty("extra");
  });

  test("rejects what is not a usable receipt", () => {
    expect(parseComposed("not json")).toBeNull();
    expect(parseComposed(JSON.stringify({ ...good, items: [good.items[0]] }))).toBeNull();
    expect(parseComposed(JSON.stringify({ ...good, names: "" }))).toBeNull();
    expect(parseComposed(JSON.stringify({ ...good, items: "lines" }))).toBeNull();
  });

  test("never keeps more than four lines", () => {
    expect(parseComposed(JSON.stringify({ ...good, items: [...good.items, ...good.items] }))!.items).toHaveLength(4);
  });
});

describe("isComposeRequest", () => {
  const ok = { description: "ไปเชียงใหม่กับแก๊ง", kind: "trip", tone: "funny" };
  test("checks every field at the boundary", () => {
    expect(isComposeRequest(ok)).toBe(true);
    expect(isComposeRequest({ ...ok, description: "   " })).toBe(false);
    expect(isComposeRequest({ ...ok, description: "x".repeat(MAX_DESCRIPTION + 1) })).toBe(false);
    expect(isComposeRequest({ ...ok, kind: "wedding" })).toBe(false);
    expect(isComposeRequest({ ...ok, tone: "angry" })).toBe(false);
    expect(isComposeRequest(null)).toBe(false);
  });
});

const allow = async () => "ok" as const;

describe("handleCompose", () => {
  const request = (body: unknown, origin = "https://papermint.test") => new Request("https://papermint.test/api/compose", {
    method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
  });
  const valid = { description: "ไปเชียงใหม่กับแก๊ง 3 วัน ฝนตกทุกวัน", kind: "trip", tone: "funny" };
  const client = (result: () => Promise<unknown>) => ({ messages: { create: vi.fn(result) } }) as unknown as Pick<Anthropic, "messages"> & { messages: { create: ReturnType<typeof vi.fn> } };
  const reply = (text: string, stop_reason = "end_turn") => async () => ({ stop_reason, content: [{ type: "thinking", thinking: "", signature: "s" }, { type: "text", text }] });

  test("is off, not broken, without an API key", async () => {
    expect((await handleCompose(request(valid), null, allow)).status).toBe(503);
  });

  test("refuses other sites, and bad input, before spending anything", async () => {
    const fake = client(reply(JSON.stringify(good)));
    expect((await handleCompose(request(valid, "https://elsewhere.example"), fake, allow)).status).toBe(403);
    expect((await handleCompose(request({ ...valid, description: "" }), fake, allow)).status).toBe(400);
    expect(fake.messages.create).not.toHaveBeenCalled();
  });

  test("asks the chosen model for schema-bound JSON at low effort, and returns the draft", async () => {
    const fake = client(reply(JSON.stringify(good)));
    const response = await handleCompose(request(valid), fake, allow);
    expect(response.status).toBe(200);
    expect((await response.json()).stamp).toBe("สายลุย ไม่ดูฟ้า");
    const params = fake.messages.create.mock.calls[0][0];
    expect(params.model).toBe(COMPOSE_MODEL);
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.messages[0].content).toContain("ไปเชียงใหม่");
  });

  test("a refusal, a cut-off answer and unusable JSON each get a clear status", async () => {
    expect((await handleCompose(request(valid), client(reply("", "refusal")), allow)).status).toBe(422);
    expect((await handleCompose(request(valid), client(reply(JSON.stringify(good), "max_tokens")), allow)).status).toBe(502);
    expect((await handleCompose(request(valid), client(reply("{}")), allow)).status).toBe(502);
  });

  test("API errors map to statuses the page can explain", async () => {
    const fails = (error: Error) => client(async () => { throw error; });
    expect((await handleCompose(request(valid), fails(new Anthropic.RateLimitError(429, undefined, "slow down", new Headers())), allow)).status).toBe(429);
    expect((await handleCompose(request(valid), fails(new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers())), allow)).status).toBe(503);
    expect((await handleCompose(request(valid), fails(new Anthropic.InternalServerError(500, undefined, "oops", new Headers())), allow)).status).toBe(502);
  });
});

describe("compose rate limit", () => {
  const request = () => new Request("https://papermint.test/api/compose", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ description: "ไปทะเลกับแม่", kind: "trip", tone: "warm" }),
  });

  /** An in-memory stand-in for the R2 bucket: get, put, list with metadata, delete. */
  function memoryBucket() {
    const store = new Map<string, { value: string; customMetadata?: Record<string, string> }>();
    return {
      store,
      async get(key: string) { const hit = store.get(key); return hit ? { text: async () => hit.value } : null; },
      async put(key: string, value: string, options?: { customMetadata?: Record<string, string> }) { store.set(key, { value, customMetadata: options?.customMetadata }); },
      async list({ prefix = "" }: { prefix?: string } = {}) {
        return { objects: [...store].filter(([key]) => key.startsWith(prefix)).map(([key, { customMetadata }]) => ({ key, customMetadata })) };
      },
      async delete(key: string) { store.delete(key); },
    };
  }

  const NOW = Date.UTC(2026, 10, 18, 10, 30);

  test("a visitor gets their hourly allowance, then a 429, and a fresh hour resets it", async () => {
    const bucket = memoryBucket();
    for (let n = 0; n < COMPOSE_LIMITS.perVisitorPerHour; n++) expect(await takeComposeSlot(bucket, "a", NOW)).toBe("ok");
    expect(await takeComposeSlot(bucket, "a", NOW)).toBe("visitor");
    expect(await takeComposeSlot(bucket, "b", NOW)).toBe("ok");
    expect(await takeComposeSlot(bucket, "a", NOW + 60 * 60 * 1000)).toBe("ok");
  });

  test("the whole site stops for the day at its cap, whoever asks", async () => {
    const bucket = memoryBucket();
    for (let n = 0; n < COMPOSE_LIMITS.perSitePerDay; n++) await takeComposeSlot(bucket, `v${n}`, NOW);
    expect(await takeComposeSlot(bucket, "someone-new", NOW)).toBe("site");
    expect(await takeComposeSlot(bucket, "someone-new", NOW + 24 * 60 * 60 * 1000)).toBe("ok");
  });

  test("spent windows are swept when a new one starts", async () => {
    const bucket = memoryBucket();
    await takeComposeSlot(bucket, "a", NOW);
    await takeComposeSlot(bucket, "a", NOW + 2 * 60 * 60 * 1000);
    const hourly = [...bucket.store.keys()].filter((key) => key.startsWith("ratelimit/h/"));
    expect(hourly).toHaveLength(1);
  });

  test("a limited request never reaches Claude, and says why", async () => {
    const create = vi.fn();
    const fake = { messages: { create } } as unknown as Pick<Anthropic, "messages">;
    const visitor = await handleCompose(request(), fake, async () => "visitor");
    const site = await handleCompose(request(), fake, async () => "site");
    expect(visitor.status).toBe(429);
    expect(site.status).toBe(429);
    expect((await visitor.json()).error).toMatch(/this hour/);
    expect((await site.json()).error).toMatch(/today/);
    expect(create).not.toHaveBeenCalled();
  });

  test("the stored visitor id is keyed, short and not the address", async () => {
    const id = await visitorId("203.0.113.7", "secret-one");
    expect(id).toMatch(/^[0-9a-f]{24}$/);
    expect(id).not.toContain("203");
    expect(await visitorId("203.0.113.7", "secret-one")).toBe(id);
    expect(await visitorId("203.0.113.7", "secret-two")).not.toBe(id);
  });
});
