import { useCallback, useRef, useState, type DragEvent as ReactDragEvent, type RefObject } from "react";

import { makeId, randomStickerTilt } from "../lib/random";
import type { DiySticker } from "../types";

const EDGE_PADDING_PERCENT = 4;
/** Matches the size and rotate sliders, so a gesture cannot exceed them. */
const MIN_SIZE = 12;
const MAX_SIZE = 48;
const MAX_ROTATION = 30;

const clampSize = (value: number) => Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, value)));
const clampRotation = (value: number) => Math.round(Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, value)));

const spanOf = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  distance: Math.hypot(b.x - a.x, b.y - a.y),
  angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
});

const clampToReceipt = (value: number) =>
  Math.max(EDGE_PADDING_PERCENT, Math.min(100 - EDGE_PADDING_PERCENT, value));

/**
 * Owns the stickers layered over the receipt: the list, which one is selected,
 * which one is mid-drag, and the text for a custom sticker.
 *
 * Positions are percentages of the receipt box, so they survive resizing and
 * serialise straight into the shared `#s=` payload.
 *
 * @param receiptRef  the receipt element, needed to turn pointer coordinates
 *                    into those percentages
 * @param onStickerAdded  fired after a sticker lands, so the caller can bring
 *                        the sticker tool forward
 */
export function useStickers(
  receiptRef: RefObject<HTMLElement | null>,
  onStickerAdded?: () => void,
) {
  const [stickers, setStickers] = useState<DiySticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [customStickerText, setCustomStickerText] = useState("");

  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId) ?? null;

  // Two-finger pinch and twist. Tracked per pointer id so the second finger can
  // land after the first without restarting the gesture.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ id: string; distance: number; angle: number; size: number; rotation: number } | null>(null);

  function trackPointerDown(sticker: DiySticker, pointerId: number, x: number, y: number) {
    pointers.current.set(pointerId, { x, y });
    if (pointers.current.size !== 2) return;
    const [a, b] = [...pointers.current.values()];
    const span = spanOf(a, b);
    gesture.current = { id: sticker.id, distance: span.distance, angle: span.angle, size: sticker.size, rotation: sticker.rotation };
  }

  /** True when two fingers consumed the move, so the caller skips repositioning. */
  function trackPointerMove(pointerId: number, x: number, y: number): boolean {
    if (!pointers.current.has(pointerId)) return false;
    pointers.current.set(pointerId, { x, y });
    const active = gesture.current;
    if (!active || pointers.current.size < 2 || active.distance === 0) return false;
    const [a, b] = [...pointers.current.values()];
    const span = spanOf(a, b);
    const size = clampSize(active.size * (span.distance / active.distance));
    const rotation = clampRotation(active.rotation + (span.angle - active.angle));
    setStickers((current) => current.map((sticker) => sticker.id === active.id ? { ...sticker, size, rotation } : sticker));
    return true;
  }

  /** True once no fingers remain, so the caller knows when the drag really ended. */
  function trackPointerUp(pointerId: number): boolean {
    pointers.current.delete(pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    return pointers.current.size === 0;
  }

  function addSticker(symbol: string, label: string, x = 50, y = 32) {
    const sticker = { id: makeId(), symbol, label, x, y, size: symbol.length > 3 ? 14 : 26, rotation: randomStickerTilt() };
    setStickers((current) => [...current, sticker]);
    setSelectedStickerId(sticker.id);
    onStickerAdded?.();
  }

  /**
   * Replaces the whole layer from a shared `#s=` payload. Stable identity, so
   * the caller's mount effect can list it as a dependency and still run once.
   */
  const hydrateStickers = useCallback((incoming: DiySticker[]) => {
    setStickers(incoming);
    setSelectedStickerId(null);
  }, []);

  function updateSelectedSticker(patch: Partial<DiySticker>) {
    if (!selectedStickerId) return;
    setStickers((current) => current.map((sticker) => sticker.id === selectedStickerId ? { ...sticker, ...patch } : sticker));
  }

  function removeSelectedSticker() {
    if (!selectedStickerId) return;
    setStickers((current) => current.filter((sticker) => sticker.id !== selectedStickerId));
    setSelectedStickerId(null);
  }

  function positionSticker(id: string, clientX: number, clientY: number) {
    const receipt = receiptRef.current; if (!receipt) return;
    const bounds = receipt.getBoundingClientRect();
    const x = clampToReceipt(((clientX - bounds.left) / bounds.width) * 100);
    const y = clampToReceipt(((clientY - bounds.top) / bounds.height) * 100);
    setStickers((current) => current.map((sticker) => sticker.id === id ? { ...sticker, x, y } : sticker));
  }

  function handleReceiptDrop(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    const symbol = event.dataTransfer.getData("application/x-papermint-symbol");
    const label = event.dataTransfer.getData("application/x-papermint-label") || symbol;
    if (!symbol) return;
    const receipt = receiptRef.current; if (!receipt) return;
    const bounds = receipt.getBoundingClientRect();
    addSticker(symbol, label, ((event.clientX - bounds.left) / bounds.width) * 100, ((event.clientY - bounds.top) / bounds.height) * 100);
  }

  return {
    stickers, selectedStickerId, draggingStickerId, customStickerText, selectedSticker,
    setSelectedStickerId, setDraggingStickerId, setCustomStickerText, hydrateStickers,
    addSticker, updateSelectedSticker, removeSelectedSticker, positionSticker, handleReceiptDrop,
    trackPointerDown, trackPointerMove, trackPointerUp,
  };
}
