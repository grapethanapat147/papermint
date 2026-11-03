"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { createHandoff, fetchHandoff, handoffUrl } from "./lib/handoff";
import { reveal } from "./lib/reveal";
import { formatIssued } from "./data/story";
import { composeReceipt } from "./lib/compose";
import { decodeLook, lookUrl, storyFromLook } from "./lib/look";
import { loadDraft, saveDraft } from "./lib/storage";
import type { SharedStory, ToolTab } from "./types";

export default function StoriesHome() {
  const draft = useStoryDraft();
  const {
    kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale,
    items, total, edition, issued, stamp, isGenerating, loadedFromShare, activeKind,
    setNames, setNote, setIssued, setDecoration, setAccent, setFontStyle, setPaperTone, setEdgeStyle, setTextScale,
    draggedItemId, setDraggedItemId, hydrateDraft, chooseKind, generateStory, appendLineItem, updateLineItem, removeLineItem,
    moveLineItem, nudgeLineItem, applyTemplate, applyComposed, toTemplate,
  } = draft;
  const { templates, isFull: templatesFull, saveTemplate, deleteTemplate } = useTemplates();
  const [activeTool, setActiveTool] = useState<ToolTab>("content");
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLine, setNewLine] = useState("");
  const [copied, setCopied] = useState(false);
  const [handoffError, setHandoffError] = useState("");
  const [handoff, setHandoff] = useState<{ url: string; expiresAt: number } | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  /** Prints a "make your own" QR under exported images. On by default; it carries only the look. */
  const [qrOnImage, setQrOnImage] = useState(true);
  /** The page was opened from a scanned look (`#t=`), so it says so once. */
  const [lookFromLink, setLookFromLink] = useState(false);
  const photo = usePhotoEditor();
  const { photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle, setPhotoError, hydratePhoto } = photo;
  const addInputRef = useRef<HTMLInputElement>(null);
  const toolTabsRef = useRef<HTMLElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLElement>(null);

  const stickerLayer = useStickers(receiptRef, () => setActiveTool("stickers"));
  const {
    stickers, selectedSticker, customStickerText, setCustomStickerText,
    addSticker, updateSelectedSticker, removeSelectedSticker, hydrateStickers,
  } = stickerLayer;

  const story: SharedStory = { kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale, stickers, items, total, edition, issued, stamp };

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
    // A `?h=` handoff wins over everything: the person clicked their own link to
    // carry this draft here, photo included. Then a shared `#s=` link, then the
    // draft already on this device.
    const handoffId = new URLSearchParams(window.location.search).get("h");
    if (handoffId) {
      let cancelled = false;
      resetHistory();
      void fetchHandoff(handoffId).then((handoff) => {
        if (cancelled || !handoff) {
          if (!cancelled) setHandoffError("That handoff link has expired or is not valid.");
          return;
        }
        applyStory(handoff.story);
        hydratePhoto(handoff.photo);
        window.history.replaceState(null, "", window.location.pathname);
      });
      return () => { cancelled = true; };
    }

    const match = window.location.hash.match(/^#s=([^&]+)/);
    const shared = match ? decodeStory(match[1]) : null;
    if (shared) {
      resetHistory();
      hydrateDraft(shared, true);
      hydrateStickers(shared.stickers ?? []);
      return;
    }
    // A scanned look from someone's image. It never carries their words, and a
    // draft already on this device keeps its own; only the look changes.
    const scanned = window.location.hash.match(/^#t=([^&]+)/);
    const look = scanned ? decodeLook(scanned[1]) : null;
    if (look) {
      resetHistory();
      const saved = loadDraft();
      applyStory(storyFromLook(look, saved));
      if (!saved) setIssued(formatIssued(new Date()));
      // The hash only exists after mount; reading it during render would desync hydration.
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setLookFromLink(true);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    const saved = loadDraft();
    resetHistory();
    if (saved) applyStory(saved);
    // A new receipt is dated the day it is made. Set after mount (the server's
    // date and timezone are not the visitor's), and absorbed into the history
    // baseline by resetHistory, so it is not an undo step.
    else setIssued(formatIssued(new Date()));
  }, [applyStory, hydrateDraft, hydratePhoto, hydrateStickers, resetHistory, setIssued]);

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



  /** Uploads this draft, photo included, and hands back a one-day link. */
  async function startHandoff() {
    setHandoffPending(true);
    setHandoffError("");
    try {
      const created = await createHandoff(story, photoData);
      setHandoff({ url: handoffUrl(created.id), expiresAt: created.expiresAt });
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "The handoff could not be created.");
    } finally {
      setHandoffPending(false);
    }
  }

  /**
   * Opens a tool from the receipt. On a phone the receipt sits above the tools,
   * so the panel that just opened would be off-screen: bring it into view, the
   * same way on every width, by checking where it actually is.
   */
  function openTool(tool: ToolTab) {
    setActiveTool(tool);
    if (toolTabsRef.current) reveal(toolTabsRef.current, "start");
  }

  /**
   * Tapping the names on the receipt goes straight to the field that edits them.
   * The panel is rendered synchronously so focus happens inside the tap itself:
   * iOS only raises the keyboard for focus given during a user gesture. While the
   * subject is still the example, focusing it selects it all (see ContentPanel).
   */
  function editSubject() {
    flushSync(() => setActiveTool("content"));
    const input = subjectInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    reveal(input, "center");
  }

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



  function downloadStory(preset: Parameters<typeof renderStoryPng>[2] = "story") {
    return renderStoryPng(
      {
        kind, edition, accent, paperTone, decoration, fontStyle, textScale,
        activeKind, names, note, total, items, stickers, issued, stamp, photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle,
        qrUrl: qrOnImage
          ? lookUrl(`${window.location.origin}${window.location.pathname}`, { kind, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale })
          : null,
      },
      setPhotoError,
      preset,
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
      {lookFromLink && !loadedFromShare && <div className="invite-banner"><span>✦</span><p><strong>You&apos;re trying a look someone shared.</strong> Their words stay with them; put your own story on it.</p><button type="button" onClick={() => { setLookFromLink(false); editSubject(); }}>Make it yours →</button></div>}

      <section className="stories-hero webapp-workspace">
        <div className="stories-intro webapp-controls">
          <div className="webapp-panel-heading"><span className="stories-kicker">DIY RECEIPT MAKER</span><small>DRAG · DROP · CLICK</small></div>
          <h1>Design it<br /><em>your way.</em></h1>
          <p>Click a tool, drag pieces around, and build a receipt that feels completely yours.</p>

          <nav ref={toolTabsRef} className="diy-tool-tabs" aria-label="Design tools">
            {([{id:"content",icon:"✎",label:"Content"},{id:"style",icon:"◐",label:"Style"},{id:"photo",icon:"◎",label:"Photo"},{id:"stickers",icon:"✦",label:"Stickers"}] as Array<{id:ToolTab;icon:string;label:string}>).map((tool) => <button type="button" key={tool.id} className={activeTool === tool.id ? "active" : ""} aria-pressed={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}><span>{tool.icon}</span><b>{tool.label}</b></button>)}
          </nav>

          {activeTool === "content" && <ContentPanel subjectInputRef={subjectInputRef} composeStory={async (description) => applyComposed(await composeReceipt(description, kind, tone))} isGenerating={isGenerating} generateStory={generateStory} kind={kind} chooseKind={chooseKind} names={names} setNames={setNames} note={note} setNote={setNote} issued={issued} setIssued={setIssued} items={items} appendLineItem={appendLineItem} updateLineItem={updateLineItem} removeLineItem={removeLineItem} templates={templates} templatesFull={templatesFull} applyTemplate={applyTemplate} saveTemplate={(name) => saveTemplate(toTemplate(name))} deleteTemplate={deleteTemplate} draggedItemId={draggedItemId} setDraggedItemId={setDraggedItemId} moveLineItem={moveLineItem} nudgeLineItem={nudgeLineItem} />}

          {activeTool === "style" && <StylePanel decoration={decoration} setDecoration={setDecoration} paperTone={paperTone} setPaperTone={setPaperTone} fontStyle={fontStyle} setFontStyle={setFontStyle} edgeStyle={edgeStyle} setEdgeStyle={setEdgeStyle} accent={accent} setAccent={setAccent} tone={tone} generateStory={generateStory} textScale={textScale} setTextScale={setTextScale} />}

          {activeTool === "photo" && <PhotoPanel photo={photo} />}

          {activeTool === "stickers" && <StickerPanel stickers={stickers} selectedSticker={selectedSticker} customStickerText={customStickerText} setCustomStickerText={setCustomStickerText} addSticker={addSticker} updateSelectedSticker={updateSelectedSticker} removeSelectedSticker={removeSelectedSticker} />}
          <small className="privacy-note">DIY changes stay on this device. Story links carry the receipt design, not your photo. Only a handoff link you create carries the photo, for 24 hours.</small>
        </div>

        <ReceiptCanvas draft={draft} stickerLayer={stickerLayer} photo={photo} receiptRef={receiptRef} setActiveTool={openTool} editSubject={editSubject} openShare={() => setShareOpen(true)} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
      </section>

      {addOpen && <AddLineModal closeModal={() => setAddOpen(false)} addInputRef={addInputRef} newLine={newLine} setNewLine={setNewLine} addLineItem={addLineItem} />}

      {shareOpen && <ShareModal closeModal={() => { setShareOpen(false); setHandoff(null); setHandoffError(""); }} startHandoff={startHandoff} handoff={handoff} handoffPending={handoffPending} handoffError={handoffError} activeKind={activeKind} names={names} items={items} nativeShare={nativeShare} copyStoryLink={copyStoryLink} copied={copied} downloadStory={downloadStory} photoData={photoData} qrOnImage={qrOnImage} setQrOnImage={setQrOnImage} />}
    </main>
  );
}
