import { useRef, type CSSProperties, type RefObject } from "react";

import { receiptChrome } from "../data/story";
import type { usePhotoEditor } from "../hooks/usePhotoEditor";
import type { useStickers } from "../hooks/useStickers";
import type { useStoryDraft } from "../hooks/useStoryDraft";
import type { ToolTab } from "../types";

type ReceiptCanvasProps = {
  /** The three editor hooks, passed whole — the canvas reads across all of them. */
  draft: ReturnType<typeof useStoryDraft>;
  stickerLayer: ReturnType<typeof useStickers>;
  photo: ReturnType<typeof usePhotoEditor>;
  /** Needed by the sticker hook to turn pointer coordinates into percentages. */
  receiptRef: RefObject<HTMLElement | null>;
  setActiveTool: (tool: ToolTab) => void;
  openShare: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * Pointer capture keeps a drag alive when the finger leaves the element, but it
 * throws NotFoundError if the id is no longer an active pointer. Never let that
 * abort the handler: without capture the drag still works over the element, with
 * it the drag also survives leaving it.
 */
function capturePointer(element: Element, pointerId: number) {
  try { element.setPointerCapture(pointerId); } catch { /* drag on without capture */ }
}

function releasePointer(element: Element, pointerId: number) {
  try { element.releasePointerCapture(pointerId); } catch { /* already gone */ }
}

export function ReceiptCanvas({
  draft, stickerLayer, photo, receiptRef, setActiveTool, openShare, undo, redo, canUndo, canRedo,
}: ReceiptCanvasProps) {
  const {
    tone, decoration, accent, paperTone, fontStyle, edgeStyle, textScale, isGenerating,
    edition, activeKind, names, note, total, items, setDraggedItemId, reorderLineItem, generateStory,
  } = draft;
  const {
    stickers, selectedStickerId, draggingStickerId,
    setSelectedStickerId, setDraggingStickerId, positionSticker, handleReceiptDrop,
    trackPointerDown, trackPointerMove, trackPointerUp,
  } = stickerLayer;
  const { photoData, photoFilterStyle, photoTransform, nudgePhotoOffset } = photo;

  // Dragging the photo repositions the crop. A drag must not also count as the
  // click that opens the photo tool, so movement past a small threshold
  // swallows the click that follows.
  const photoDrag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  return (
    <section className={`story-stage webapp-preview diy-canvas tone-${tone} decor-${decoration} accent-${accent} paper-${paperTone} font-${fontStyle} edge-${edgeStyle} ${photoData ? "has-photo" : ""} ${isGenerating ? "printing" : ""}`} id="create" aria-label="Interactive receipt canvas">
        <div className="canvas-topline">
        <span className="webapp-preview-label"><i /> DIY CANVAS · CLICK OR DROP TO DESIGN</span>
        <div className="canvas-history" aria-label="History">
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">↶</button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">↷</button>
        </div>
      </div>
        <article ref={receiptRef} className="life-receipt diy-receipt" id="story-receipt" aria-live="polite" style={{"--type-scale":textScale} as CSSProperties} onDragOver={(event) => event.preventDefault()} onDrop={handleReceiptDrop} onPointerMove={(event) => { if (draggingStickerId) positionSticker(draggingStickerId,event.clientX,event.clientY); }} onPointerUp={() => setDraggingStickerId(null)}>
          <div className="diy-sticker-layer">{stickers.map((sticker) => <button type="button" key={sticker.id} className={`diy-sticker ${selectedStickerId === sticker.id ? "selected" : ""}`} style={{left:`${sticker.x}%`,top:`${sticker.y}%`,fontSize:`${sticker.size}px`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`}} onPointerDown={(event) => { event.stopPropagation(); setSelectedStickerId(sticker.id); setDraggingStickerId(sticker.id); setActiveTool("stickers"); trackPointerDown(sticker, event.pointerId, event.clientX, event.clientY); capturePointer(event.currentTarget, event.pointerId); }} onPointerMove={(event) => { event.stopPropagation(); if (trackPointerMove(event.pointerId, event.clientX, event.clientY)) return; if (draggingStickerId === sticker.id) { positionSticker(sticker.id, event.clientX, event.clientY); } }} onPointerUp={(event) => { event.stopPropagation(); const lastFinger = trackPointerUp(event.pointerId); releasePointer(event.currentTarget, event.pointerId); if (lastFinger) setDraggingStickerId(null); }} onPointerCancel={(event) => { event.stopPropagation(); if (trackPointerUp(event.pointerId)) setDraggingStickerId(null); }} onClick={(event) => { event.stopPropagation(); setSelectedStickerId(sticker.id); setActiveTool("stickers"); }} aria-label={`Move ${sticker.label} sticker`}>{sticker.symbol}</button>)}</div>
          <div className="life-top"><span>{receiptChrome.brand}</span><span>NO. {String(edition).padStart(4, "0")}</span></div>
          {/* The receipt body doubles as a pointer shortcut: clicking a region opens the
              matching tool panel. These are redundant conveniences — every panel is already
              reachable from the keyboard via the tool tab bar above — so these regions are
              deliberately not focusable. Adding role="button"/tabIndex here would create eight
              duplicate tab stops on a preview and strip the heading, paragraph and list
              semantics screen readers rely on to read the receipt itself. */}
          {/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */}
          <div className="life-seal receipt-click-target" onClick={() => setActiveTool("style")}>P</div><h2 className="receipt-click-target" onClick={() => setActiveTool("content")}>{activeKind.label}</h2><p className="receipt-click-target" onClick={() => setActiveTool("content")}>{names || receiptChrome.fallbackNames}</p>
          <div className="life-date"><span>{receiptChrome.issuedLabel}</span><span>{receiptChrome.issuedOn}</span></div>
          {photoData && <div
            className="life-photo receipt-click-target"
            onClick={() => { if (photoDrag.current?.moved) { photoDrag.current = null; return; } setActiveTool("photo"); }}
            onPointerDown={(event) => {
              photoDrag.current = { x: event.clientX, y: event.clientY, moved: false };
              capturePointer(event.currentTarget, event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = photoDrag.current;
              if (!drag) return;
              const box = event.currentTarget.getBoundingClientRect();
              if (!box.width || !box.height) return;
              const dx = event.clientX - drag.x;
              const dy = event.clientY - drag.y;
              if (!drag.moved && Math.hypot(dx, dy) < 4) return;
              drag.moved = true;
              drag.x = event.clientX;
              drag.y = event.clientY;
              nudgePhotoOffset((dx / box.width) * 100, (dy / box.height) * 100);
            }}
            onPointerUp={(event) => { releasePointer(event.currentTarget, event.pointerId); }}
            onPointerCancel={() => { photoDrag.current = null; }}
          ><img src={photoData} alt="Story moment" draggable={false} style={{ filter: photoFilterStyle, transform: photoTransform }} /><span>{receiptChrome.photoCaption}</span></div>}
          <div className="life-items receipt-click-target" onClick={() => setActiveTool("content")}>{items.map((item) => <div key={item.id} draggable onDragStart={(event) => { event.stopPropagation(); setDraggedItemId(item.id); }} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); reorderLineItem(item.id); }}><span><i>⠿</i>{item.label}</span><b>{item.quantity}</b></div>)}</div>
          <div className="life-total receipt-click-target" onClick={() => setActiveTool("style")}><span>{receiptChrome.totalLabel}</span><strong>{total}</strong></div>
          <div className="life-footer"><span className="life-stamp receipt-click-target" onClick={() => setActiveTool("stickers")}>STILL<br />ADDING<br />UP</span><p className="receipt-click-target" onClick={() => setActiveTool("content")}>{note || receiptChrome.fallbackNote}</p></div>
          {/* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */}
          <div className="life-barcode" /><small>{receiptChrome.disclaimer}</small>
        </article>
        <div className="receipt-actions diy-actions"><button type="button" onClick={() => setActiveTool("content")}>✎ Edit</button><button type="button" onClick={() => setActiveTool("stickers")}>✦ Add sticker</button><button type="button" onClick={() => generateStory(tone)}>↻ Remix</button><button className="share-story" type="button" onClick={openShare}>Share ↗</button></div>
    </section>
  );
}
