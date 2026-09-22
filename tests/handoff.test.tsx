import { describe, expect, test, vi } from "vitest";

import {
  HANDOFF_TTL_MS, MAX_HANDOFF_BYTES, handoffKey, isExpired, isValidHandoffId, makeHandoffId,
} from "../app/lib/handoff-shared";
import { downscalePhoto } from "../app/lib/handoff";

describe("handoff ids", () => {
  test("are 22 unguessable url-safe characters", () => {
    for (let n = 0; n < 50; n += 1) {
      const id = makeHandoffId();
      expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(isValidHandoffId(id)).toBe(true);
    }
  });

  test("do not repeat", () => {
    const ids = new Set(Array.from({ length: 500 }, () => makeHandoffId()));
    expect(ids.size).toBe(500);
  });

  test("reject anything that is not exactly that shape", () => {
    for (const bad of ["", "short", "A".repeat(21), "A".repeat(23), "has/slash/xxxxxxxxxxxx", "../../etc/passwd"]) {
      expect(isValidHandoffId(bad)).toBe(false);
    }
  });

  test("keys are namespaced, so a handoff cannot address another object", () => {
    expect(handoffKey("AAAAAAAAAAAAAAAAAAAAAA")).toBe("handoff/AAAAAAAAAAAAAAAAAAAAAA");
  });
});

describe("expiry", () => {
  test("is 24 hours, the retention เกรพ decided", () => {
    expect(HANDOFF_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  test("a record is live until its expiry and gone from that moment on", () => {
    const now = 1_000_000;
    expect(isExpired({ expiresAt: now + 1 }, now)).toBe(false);
    expect(isExpired({ expiresAt: now }, now)).toBe(true);
    expect(isExpired({ expiresAt: now - 1 }, now)).toBe(true);
  });

  test("a record written now is live just before 24h and dead just after", () => {
    const created = Date.now();
    const expiresAt = created + HANDOFF_TTL_MS;
    expect(isExpired({ expiresAt }, created + HANDOFF_TTL_MS - 1000)).toBe(false);
    expect(isExpired({ expiresAt }, created + HANDOFF_TTL_MS + 1000)).toBe(true);
  });
});

describe("photo downscale", () => {
  /** jsdom never fires load or error on an Image, so only the timeout settles it. */
  const settle = async (input: string) => {
    vi.useFakeTimers();
    const pending = downscalePhoto(input);
    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();
    return pending;
  };

  test("a decode that never resolves gives back the original instead of hanging", async () => {
    await expect(settle("data:image/png;base64,notreallyanimage")).resolves.toBe(
      "data:image/png;base64,notreallyanimage",
    );
  });

  test("never throws, whatever it is handed", async () => {
    for (const input of ["", "not a data url", "data:image/png;base64,"]) {
      await expect(settle(input)).resolves.toBeTypeOf("string");
    }
  });
});

describe("size guard", () => {
  test("the cap is well under a 25MB object limit but roomy for a downscaled photo", () => {
    expect(MAX_HANDOFF_BYTES).toBe(600_000);
    // a 1440-edge JPEG at quality 0.8 measures roughly 215KB in the decision doc
    expect(MAX_HANDOFF_BYTES).toBeGreaterThan(215_000 * 2);
  });
});
