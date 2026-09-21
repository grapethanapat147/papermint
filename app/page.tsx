"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContentPanel } from "./components/ContentPanel";
import { PhotoPanel } from "./components/PhotoPanel";
import { AddLineModal } from "./components/AddLineModal";
import { ReceiptCanvas } from "./components/ReceiptCanvas";
import { ShareModal } from "./components/ShareModal";
import { StickerPanel } from "./components/StickerPanel";
import { StylePanel } from "./components/StylePanel";
import { usePhotoEditor } from "./hooks/usePhotoEditor";
import { useStickers } from "./hooks/useStickers";
import { useDraftHistory } from "./hooks/useDraftHistory";
import { useStoryDraft } from "./hooks/useStoryDraft";
import { useTemplates } from "./hooks/useTemplates";
import { downloadStory as renderStoryPng } from "./lib/export";
import { decodeStory, encodeStory } from "./lib/share";
import { loadDraft, saveDraft } from "./lib/storage";
import type { SharedStory, ToolTab } from "./types";

export default function StoriesHome() {
  const draft = useStoryDraft();
  const {
    kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale,
    items, total, edition, isGenerating, loadedFromShare, activeKind,
    setNames, setNote, setDecoration, setAccent, setFontStyle, setPaperTone, setEdgeStyle, setTextScale,
    draggedItemId, setDraggedItemId, hydrateDraft, chooseKind, generateStory, appendLineItem, updateLineItem, removeLineItem,
    moveLineItem, nudgeLineItem, applyTemplate, toTemplate,
  } = draft;
  const { templates, isFull: templatesFull, saveTemplate, deleteTemplate } = useTemplates();
  const [activeTool, setActiveTool] = useState<ToolTab>("content");
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLine, setNewLine] = useState("");
  const [copied, setCopied] = useState(false);
  const photo = usePhotoEditor();
  const { photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle, setPhotoError } = photo;
  const addInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLElement>(null);

  const stickerLayer = useStickers(receiptRef, () => setActiveTool("stickers"));
  const {
    stickers, selectedSticker, customStickerText, setCustomStickerText,
    addSticker, updateSelectedSticker, removeSelectedSticker, hydrateStickers,
  } = stickerLayer;

  const story: SharedStory = { kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale, stickers, items, total, edition };

  /** Restores a snapshot without claiming it came from someone else's link. */
  const applyStory = useCallback((snapshot: SharedStory) => {
    hydrateDraft(snapshot, false);
    hydrateStickers(snapshot.stickers ?? []);
  }, [hydrateDraft, hydrateStickers]);

  const { undo, redo, canUndo, canRedo, resetHistory } = useDraftHistory(story, applyStory);

  // A URL fragment is never sent to the server, so neither a shared story nor a
  // saved draft can be known during SSR. Seeding this state in the initializers
  // would desync hydration, so both are applied once after mount.
  //
  // A shared link wins over a saved draft: arriving on someone's link should show
  // their receipt, not yesterday's work. The saved draft is not cleared, so
  // navigating back to a bare URL brings it back.
  useEffect(() => {
    const match = window.location.hash.match(/^#s=([^&]+)/);
    const shared = match ? decodeStory(match[1]) : null;
    if (shared) {
      resetHistory();
      hydrateDraft(shared, true);
      hydrateStickers(shared.stickers ?? []);
      return;
    }
    const saved = loadDraft();
    if (saved) {
      resetHistory();
      applyStory(saved);
    }
  }, [applyStory, hydrateDraft, hydrateStickers, resetHistory]);

  // Autosave, coalesced so a burst of typing writes once. Photos are excluded by
  // the SharedStory shape itself, which also keeps this well inside the quota.
  //
  // Paused while a shared story is on screen: someone else's receipt must not
  // overwrite the draft on this device. A shared story is always recoverable from
  // its own link, and remixing clears loadedFromShare, which resumes saving.
  const storyKey = JSON.stringify(story);
  useEffect(() => {
    if (loadedFromShare) return;
    const timer = window.setTimeout(() => { saveDraft(JSON.parse(storyKey) as SharedStory); }, 600);
    return () => window.clearTimeout(timer);
  }, [storyKey, loadedFromShare]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      // Let inputs keep their own native undo stack.
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

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
        activeKind, names, total, items, stickers, photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle,
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

          {activeTool === "content" && <ContentPanel isGenerating={isGenerating} generateStory={generateStory} kind={kind} chooseKind={chooseKind} names={names} setNames={setNames} note={note} setNote={setNote} items={items} appendLineItem={appendLineItem} updateLineItem={updateLineItem} removeLineItem={removeLineItem} templates={templates} templatesFull={templatesFull} applyTemplate={applyTemplate} saveTemplate={(name) => saveTemplate(toTemplate(name))} deleteTemplate={deleteTemplate} draggedItemId={draggedItemId} setDraggedItemId={setDraggedItemId} moveLineItem={moveLineItem} nudgeLineItem={nudgeLineItem} />}

          {activeTool === "style" && <StylePanel decoration={decoration} setDecoration={setDecoration} paperTone={paperTone} setPaperTone={setPaperTone} fontStyle={fontStyle} setFontStyle={setFontStyle} edgeStyle={edgeStyle} setEdgeStyle={setEdgeStyle} accent={accent} setAccent={setAccent} tone={tone} generateStory={generateStory} textScale={textScale} setTextScale={setTextScale} />}

          {activeTool === "photo" && <PhotoPanel photo={photo} />}

          {activeTool === "stickers" && <StickerPanel stickers={stickers} selectedSticker={selectedSticker} customStickerText={customStickerText} setCustomStickerText={setCustomStickerText} addSticker={addSticker} updateSelectedSticker={updateSelectedSticker} removeSelectedSticker={removeSelectedSticker} />}
          <small className="privacy-note">DIY changes stay on this device. Shared links carry the receipt design, but not uploaded photos.</small>
        </div>

        <ReceiptCanvas draft={draft} stickerLayer={stickerLayer} photo={photo} receiptRef={receiptRef} setActiveTool={setActiveTool} openShare={() => setShareOpen(true)} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
      </section>

      {addOpen && <AddLineModal closeModal={() => setAddOpen(false)} addInputRef={addInputRef} newLine={newLine} setNewLine={setNewLine} addLineItem={addLineItem} />}

      {shareOpen && <ShareModal closeModal={() => setShareOpen(false)} activeKind={activeKind} names={names} items={items} nativeShare={nativeShare} copyStoryLink={copyStoryLink} copied={copied} downloadStory={downloadStory} photoData={photoData} />}
    </main>
  );
}
