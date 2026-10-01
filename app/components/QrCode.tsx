import { useMemo } from "react";
import { qrPath } from "../lib/qr";

/**
 * An inline SVG QR, so the second device can scan rather than type the link.
 * Colours are fixed, not themed: scanners need dark modules on a light ground.
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, d } = useMemo(() => qrPath(value), [value]);
  return (
    <svg className="qr-code" role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
