"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ContentPanel } from "./components/ContentPanel";
import { PhotoPanel } from "./components/PhotoPanel";
import { StickerPanel } from "./components/StickerPanel";
import { StylePanel } from "./components/StylePanel";
import { usePhotoEditor } from "./hooks/usePhotoEditor";
import { useStickers } from "./hooks/useStickers";
import { useStoryDraft } from "./hooks/useStoryDraft";
import { downloadStory as renderStoryPng } from "./lib/export";
import { decodeStory, encodeStory } from "./lib/share";
import type { SharedStory, ToolTab } from "./types";

export default function StoriesHome() {
  const {
    kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale,
    items, total, edition, isGenerating, loadedFromShare, activeKind,
    setNames, setNote, setDecoration, setAccent, setFontStyle, setPaperTone, setEdgeStyle,
    setTextScale, setDraggedItemId,
    hydrateDraft, chooseKind, generateStory, appendLineItem, updateLineItem, removeLineItem, reorderLineItem,
  } = useStoryDraft();
  const [activeTool, setActiveTool] = useState<ToolTab>("content");
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLine, setNewLine] = useState("");
  const [copied, setCopied] = useState(false);
  const photo = usePhotoEditor();
  const { photoData, photoZoom, photoFilterStyle, setPhotoError } = photo;
  const addInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLElement>(null);

  const {
    stickers, selectedStickerId, draggingStickerId, customStickerText, selectedSticker,
    setSelectedStickerId, setDraggingStickerId, setCustomStickerText, hydrateStickers,
    addSticker, updateSelectedSticker, removeSelectedSticker, positionSticker, handleReceiptDrop,
  } = useStickers(receiptRef, () => setActiveTool("stickers"));

  const story: SharedStory = { kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale, stickers, items, total, edition };

  // A URL fragment is never sent to the server, so a shared story cannot be known
  // during SSR. Seeding this state in the initializers would desync hydration, which
  // makes applying it once after mount the only correct option here.
  useEffect(() => {
    const match = window.location.hash.match(/^#s=([^&]+)/);
    if (!match) return;
    const shared = decodeStory(match[1]);
    if (!shared) return;
    hydrateDraft(shared);
    hydrateStickers(shared.stickers ?? []);
  }, [hydrateDraft, hydrateStickers]);

  useEffect(() => {
    if (addOpen) { addInputRef.current?.focus(); }
  }, [addOpen]);



  function addLineItem() {
    if (!newLine.trim()) return;
    appendLineItem(newLine.trim());
    setNewLine(""); setAddOpen(false);
  }









  function buildShareUrl() {
    return `${window.location.origin}${window.location.pathname}#s=${encodeStory(story)}`;
  }

  async function copyStoryLink() {
    await navigator.clipboard?.writeText(buildShareUrl());
    setCopied(true); window.setTimeout(() => setCopied(false), 1700);
  }

  async function nativeShare() {
    const url = buildShareUrl();
    if (navigator.share) await navigator.share({ title: `${activeKind.label} · Papermint Stories`, text: "Add your line item to our story receipt.", url });
    else await copyStoryLink();
  }



  function downloadStory() {
    return renderStoryPng(
      {
        kind, edition, accent, paperTone, decoration, fontStyle, textScale,
        activeKind, names, total, items, stickers, photoData, photoZoom, photoFilterStyle,
      },
      setPhotoError,
    );
  }

  return (
    <main className="stories-shell single-screen webapp-shell" id="top">
      <header className="webapp-topbar">
        <a className="brand" href="#top" aria-label="Papermint Stories home"><span className="brand-mark">P</span><span>Papermint <small>STORIES</small></span></a>
        <span className="webapp-title">Story Receipt Maker</span>
        <div className="webapp-top-actions"><span><i /> Private on this device</span><a href="/studio" aria-label="Open Business Studio">Studio ↗</a></div>
      </header>

      {loadedFromShare && <div className="invite-banner"><span>✦</span><p><strong>You were invited into this story.</strong> Add one memory, then pass it on.</p><button type="button" onClick={() => setAddOpen(true)}>Add your line item →</button></div>}

      <section className="stories-hero webapp-workspace">
        <div className="stories-intro webapp-controls">
          <div className="webapp-panel-heading"><span className="stories-kicker">DIY RECEIPT MAKER</span><small>DRAG · DROP · CLICK</small></div>
          <h1>Design it<br /><em>your way.</em></h1>
          <p>Click a tool, drag pieces around, and build a receipt that feels completely yours.</p>

          <nav className="diy-tool-tabs" aria-label="Design tools">
            {([{id:"content",icon:"✎",label:"Content"},{id:"style",icon:"◐",label:"Style"},{id:"photo",icon:"◎",label:"Photo"},{id:"stickers",icon:"✦",label:"Stickers"}] as Array<{id:ToolTab;icon:string;label:string}>).map((tool) => <button type="button" key={tool.id} className={activeTool === tool.id ? "active" : ""} aria-pressed={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}><span>{tool.icon}</span><b>{tool.label}</b></button>)}
          </nav>

          {activeTool === "content" && <ContentPanel isGenerating={isGenerating} generateStory={generateStory} kind={kind} chooseKind={chooseKind} names={names} setNames={setNames} note={note} setNote={setNote} items={items} appendLineItem={appendLineItem} updateLineItem={updateLineItem} removeLineItem={removeLineItem} setDraggedItemId={setDraggedItemId} reorderLineItem={reorderLineItem} />}

          {activeTool === "style" && <StylePanel decoration={decoration} setDecoration={setDecoration} paperTone={paperTone} setPaperTone={setPaperTone} fontStyle={fontStyle} setFontStyle={setFontStyle} edgeStyle={edgeStyle} setEdgeStyle={setEdgeStyle} accent={accent} setAccent={setAccent} tone={tone} generateStory={generateStory} textScale={textScale} setTextScale={setTextScale} />}

          {activeTool === "photo" && <PhotoPanel photo={photo} />}

          {activeTool === "stickers" && <StickerPanel stickers={stickers} selectedSticker={selectedSticker} customStickerText={customStickerText} setCustomStickerText={setCustomStickerText} addSticker={addSticker} updateSelectedSticker={updateSelectedSticker} removeSelectedSticker={removeSelectedSticker} />}
          <small className="privacy-note">DIY changes stay on this device. Shared links carry the receipt design, but not uploaded photos.</small>
        </div>

        <section className={`story-stage webapp-preview diy-canvas tone-${tone} decor-${decoration} accent-${accent} paper-${paperTone} font-${fontStyle} edge-${edgeStyle} ${photoData ? "has-photo" : ""} ${isGenerating ? "printing" : ""}`} id="create" aria-label="Interactive receipt canvas">
          <span className="webapp-preview-label"><i /> DIY CANVAS · CLICK OR DROP TO DESIGN</span>
          <article ref={receiptRef} className="life-receipt diy-receipt" id="story-receipt" aria-live="polite" style={{"--type-scale":textScale} as CSSProperties} onDragOver={(event) => event.preventDefault()} onDrop={handleReceiptDrop} onPointerMove={(event) => { if (draggingStickerId) positionSticker(draggingStickerId,event.clientX,event.clientY); }} onPointerUp={() => setDraggingStickerId(null)}>
            <div className="diy-sticker-layer">{stickers.map((sticker) => <button type="button" key={sticker.id} className={`diy-sticker ${selectedStickerId === sticker.id ? "selected" : ""}`} style={{left:`${sticker.x}%`,top:`${sticker.y}%`,fontSize:`${sticker.size}px`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`}} onPointerDown={(event) => { event.stopPropagation(); setSelectedStickerId(sticker.id); setDraggingStickerId(sticker.id); setActiveTool("stickers"); }} onClick={(event) => { event.stopPropagation(); setSelectedStickerId(sticker.id); setActiveTool("stickers"); }} aria-label={`Move ${sticker.label} sticker`}>{sticker.symbol}</button>)}</div>
            <div className="life-top"><span>PAPERMINT STORIES</span><span>NO. {String(edition).padStart(4, "0")}</span></div>
            {/* The receipt body doubles as a pointer shortcut: clicking a region opens the
                matching tool panel. These are redundant conveniences — every panel is already
                reachable from the keyboard via the tool tab bar above — so these regions are
                deliberately not focusable. Adding role="button"/tabIndex here would create eight
                duplicate tab stops on a preview and strip the heading, paragraph and list
                semantics screen readers rely on to read the receipt itself. */}
            {/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */}
            <div className="life-seal receipt-click-target" onClick={() => setActiveTool("style")}>P</div><h2 className="receipt-click-target" onClick={() => setActiveTool("content")}>{activeKind.label}</h2><p className="receipt-click-target" onClick={() => setActiveTool("content")}>{names || "Your story"}</p>
            <div className="life-date"><span>ISSUED WITH FEELINGS</span><span>24 AUG 2026</span></div>
            {photoData && <div className="life-photo receipt-click-target" onClick={() => setActiveTool("photo")}><img src={photoData} alt="Story moment" style={{ filter: photoFilterStyle, transform: `scale(${photoZoom})` }} /><span>THE MOMENT, AS IT FELT</span></div>}
            <div className="life-items receipt-click-target" onClick={() => setActiveTool("content")}>{items.map((item) => <div key={item.id} draggable onDragStart={(event) => { event.stopPropagation(); setDraggedItemId(item.id); }} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); reorderLineItem(item.id); }}><span><i>⠿</i>{item.label}</span><b>{item.quantity}</b></div>)}</div>
            <div className="life-total receipt-click-target" onClick={() => setActiveTool("style")}><span>TOTAL</span><strong>{total}</strong></div>
            <div className="life-footer"><span className="life-stamp receipt-click-target" onClick={() => setActiveTool("stickers")}>STILL<br />ADDING<br />UP</span><p className="receipt-click-target" onClick={() => setActiveTool("content")}>{note || "Not perfect. Still ours."}</p></div>
            {/* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions */}
            <div className="life-barcode" /><small>NOT A FINANCIAL DOCUMENT · JUST PROOF IT MATTERED</small>
          </article>
          <div className="receipt-actions diy-actions"><button type="button" onClick={() => setActiveTool("content")}>✎ Edit</button><button type="button" onClick={() => setActiveTool("stickers")}>✦ Add sticker</button><button type="button" onClick={() => generateStory(tone)}>↻ Remix</button><button className="share-story" type="button" onClick={() => setShareOpen(true)}>Share ↗</button></div>
        </section>
      </section>

      {addOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAddOpen(false); }}><section className="story-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="modal-close" type="button" onClick={() => setAddOpen(false)}>×</button><span className="modal-icon">＋</span><span className="stories-kicker">YOUR TURN</span><h2 id="add-title">Add one thing only you would know.</h2><p>The best line items are strangely specific.</p><input ref={addInputRef} value={newLine} onChange={(event) => setNewLine(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLineItem(); }} placeholder="The voice note you sent at 2:14 AM" /><button className="modal-primary" type="button" onClick={addLineItem}>Add to our receipt →</button></section></div>}

      {shareOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShareOpen(false); }}><section className="story-modal share-story-modal" role="dialog" aria-modal="true" aria-labelledby="share-story-title"><button className="modal-close" type="button" onClick={() => setShareOpen(false)}>×</button><span className="modal-icon">↗</span><span className="stories-kicker">PASS IT ON</span><h2 id="share-story-title">Who should add the next line?</h2><p>The link carries this receipt with it. Anyone you send it to can view, add, and remix.</p><div className="share-preview"><span className="share-mini-receipt">{activeKind.icon}</span><div><strong>{activeKind.label}</strong><small>{names} · {items.length} line items</small></div></div><div className="story-share-actions"><button type="button" onClick={nativeShare}>Share with a friend</button><button type="button" onClick={copyStoryLink}>{copied ? "Link copied!" : "Copy story link"}</button><button type="button" onClick={downloadStory}>Download Story PNG</button></div><small className="link-note">{photoData ? "Your photo stays private on this device and is included only in the downloaded PNG. The story link carries text and styling." : "Story data is encoded in the URL; there is no public feed or permanent database yet."}</small></section></div>}
    </main>
  );
}
