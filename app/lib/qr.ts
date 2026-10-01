import qrcode from "qrcode-generator";

/** Modules of white border a scanner needs around the code (the spec's quiet zone). */
export const QR_QUIET_ZONE = 4;

/**
 * The QR for `text` as one SVG path, one unit per module. Medium error
 * correction survives a phone screen's glare without bloating a ~70-char link.
 * The returned `size` already includes the quiet zone on every side.
 */
export function qrPath(text: string): { size: number; d: string } {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const count = code.getModuleCount();
  let d = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (code.isDark(row, col)) d += `M${col + QR_QUIET_ZONE} ${row + QR_QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { size: count + QR_QUIET_ZONE * 2, d };
}
