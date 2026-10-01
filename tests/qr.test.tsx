import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { QrCode } from "../app/components/QrCode";
import { QR_QUIET_ZONE, qrPath } from "../app/lib/qr";

const LINK = "https://papermint-receipt-studio.grapetnp147.chatgpt.site/?h=AbCdEfGhIjKlMnOpQrStUv";

/** Back from the path to a grid of dark cells, so the tests can read the symbol. */
function grid(text: string) {
  const { size, d } = qrPath(text);
  const dark = new Set([...d.matchAll(/M(\d+) (\d+)/g)].map(([, x, y]) => `${x},${y}`));
  return { size, isDark: (x: number, y: number) => dark.has(`${x},${y}`) };
}

describe("qrPath", () => {
  test("a handoff link fits a small version, framed by the quiet zone", () => {
    const { size } = grid(LINK);
    const modules = size - QR_QUIET_ZONE * 2;
    // Version v is 17 + 4v modules. A ~80-char link at level M is version 5 or 6;
    // anything bigger means the link grew and the code got harder to scan.
    expect((modules - 17) % 4).toBe(0);
    expect(modules).toBeLessThanOrEqual(41);
  });

  test("nothing is drawn inside the quiet zone", () => {
    const { size, isDark } = grid(LINK);
    for (let i = 0; i < size; i += 1) {
      for (let q = 0; q < QR_QUIET_ZONE; q += 1) {
        expect(isDark(i, q) || isDark(q, i) || isDark(i, size - 1 - q) || isDark(size - 1 - q, i)).toBe(false);
      }
    }
  });

  test("the three finder squares sit in the corners a scanner looks for", () => {
    const { size, isDark } = grid(LINK);
    // 7x7: dark outer ring, light ring inside it, dark 3x3 centre.
    const finderAt = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
          if (isDark(ox + x, oy + y) !== (ring !== 2)) return false;
        }
      }
      return true;
    };
    const near = QR_QUIET_ZONE;
    const far = size - QR_QUIET_ZONE - 7;
    expect(finderAt(near, near)).toBe(true);
    expect(finderAt(far, near)).toBe(true);
    expect(finderAt(near, far)).toBe(true);
    expect(finderAt(far, far)).toBe(false);
  });

  test("the same link always draws the same code, and a different id a different one", () => {
    expect(qrPath(LINK)).toEqual(qrPath(LINK));
    expect(qrPath(LINK).d).not.toBe(qrPath(LINK.replace("AbCd", "ZyXw")).d);
  });
});

describe("<QrCode>", () => {
  test("is an image with a label, drawn black on white whatever the theme", () => {
    const { container } = render(<QrCode value={LINK} label="QR for the link" />);
    const svg = screen.getByRole("img", { name: "QR for the link" });
    const { size } = qrPath(LINK);
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${size} ${size}`);
    expect(container.querySelector("rect")?.getAttribute("fill")).toBe("#fff");
    expect(container.querySelector("path")?.getAttribute("fill")).toBe("#000");
  });
});
