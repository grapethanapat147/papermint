import { useCallback, useState, type DragEvent as ReactDragEvent, type RefObject } from "react";

import { makeId, randomStickerTilt } from "../lib/random";
import type { DiySticker } from "../types";

const EDGE_PADDING_PERCENT = 4;

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
  };
}
