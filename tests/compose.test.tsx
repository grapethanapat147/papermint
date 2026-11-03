import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test, vi } from "vitest";

import { handleCompose } from "../app/lib/compose-server";
import { COMPOSE_MODEL, MAX_DESCRIPTION, isComposeRequest, parseComposed } from "../app/lib/compose-shared";

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

describe("handleCompose", () => {
  const request = (body: unknown, origin = "https://papermint.test") => new Request("https://papermint.test/api/compose", {
    method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body),
  });
  const valid = { description: "ไปเชียงใหม่กับแก๊ง 3 วัน ฝนตกทุกวัน", kind: "trip", tone: "funny" };
  const client = (result: () => Promise<unknown>) => ({ messages: { create: vi.fn(result) } }) as unknown as Pick<Anthropic, "messages"> & { messages: { create: ReturnType<typeof vi.fn> } };
  const reply = (text: string, stop_reason = "end_turn") => async () => ({ stop_reason, content: [{ type: "thinking", thinking: "", signature: "s" }, { type: "text", text }] });

  test("is off, not broken, without an API key", async () => {
    expect((await handleCompose(request(valid), null)).status).toBe(503);
  });

  test("refuses other sites, and bad input, before spending anything", async () => {
    const fake = client(reply(JSON.stringify(good)));
    expect((await handleCompose(request(valid, "https://elsewhere.example"), fake)).status).toBe(403);
    expect((await handleCompose(request({ ...valid, description: "" }), fake)).status).toBe(400);
    expect(fake.messages.create).not.toHaveBeenCalled();
  });

  test("asks the chosen model for schema-bound JSON at low effort, and returns the draft", async () => {
    const fake = client(reply(JSON.stringify(good)));
    const response = await handleCompose(request(valid), fake);
    expect(response.status).toBe(200);
    expect((await response.json()).stamp).toBe("สายลุย ไม่ดูฟ้า");
    const params = fake.messages.create.mock.calls[0][0];
    expect(params.model).toBe(COMPOSE_MODEL);
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.messages[0].content).toContain("ไปเชียงใหม่");
  });

  test("a refusal, a cut-off answer and unusable JSON each get a clear status", async () => {
    expect((await handleCompose(request(valid), client(reply("", "refusal")))).status).toBe(422);
    expect((await handleCompose(request(valid), client(reply(JSON.stringify(good), "max_tokens")))).status).toBe(502);
    expect((await handleCompose(request(valid), client(reply("{}")))).status).toBe(502);
  });

  test("API errors map to statuses the page can explain", async () => {
    const fails = (error: Error) => client(async () => { throw error; });
    expect((await handleCompose(request(valid), fails(new Anthropic.RateLimitError(429, undefined, "slow down", new Headers())))).status).toBe(429);
    expect((await handleCompose(request(valid), fails(new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers())))).status).toBe(503);
    expect((await handleCompose(request(valid), fails(new Anthropic.InternalServerError(500, undefined, "oops", new Headers())))).status).toBe(502);
  });
});
