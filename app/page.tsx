"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent } from "react";

type StoryKind = "friendship" | "month" | "trip" | "work" | "era";
type Tone = "warm" | "funny" | "honest";
type Decoration = "classic" | "botanical" | "mono" | "playful";
type Accent = "coral" | "sage" | "ink" | "mustard" | "lavender" | "blue";
type PhotoFilter = "original" | "warm" | "film" | "mono" | "dream";
type ToolTab = "content" | "style" | "photo" | "stickers";
type FontStyle = "editorial" | "rounded" | "mono";
type PaperTone = "cream" | "white" | "blush" | "sage";
type EdgeStyle = "torn" | "straight" | "rounded";
type StoryItem = { id: string; label: string; quantity: string };
type DiySticker = { id: string; symbol: string; label: string; x: number; y: number; size: number; rotation: number };
type SharedStory = { kind: StoryKind; names: string; note: string; tone: Tone; decoration?: Decoration; accent?: Accent; fontStyle?: FontStyle; paperTone?: PaperTone; edgeStyle?: EdgeStyle; textScale?: number; stickers?: DiySticker[]; items: StoryItem[]; total: string; edition: number };

const kinds: Array<{ id: StoryKind; label: string; icon: string; prompt: string }> = [
  { id: "friendship", label: "Our Friendship", icon: "♡", prompt: "Mook & Ploy" },
  { id: "month", label: "My Month", icon: "◷", prompt: "August was a beautiful mess" },
  { id: "trip", label: "Our Trip", icon: "⌁", prompt: "Chiang Mai with the best people" },
  { id: "work", label: "Work Survival", icon: "⌘", prompt: "Launch week, somehow survived" },
  { id: "era", label: "My Current Era", icon: "✦", prompt: "Learning to choose myself" },
];

const storyLines: Record<StoryKind, Record<Tone, Array<[string, string]>>> = {
  friendship: {
    warm: [["Late-night calls", "× 47"], ["Times you showed up", "× ∞"], ["Tiny things you remembered", "× 28"], ["Years of choosing each other", "× MORE"]],
    funny: [["Plans we cancelled", "× 12"], ["Bad jokes that still worked", "× 999"], ["Screenshots without context", "× 84"], ["Meals we said we'd split", "× NEVER"]],
    honest: [["Hard truths said gently", "× 9"], ["Silences that felt safe", "× 31"], ["Arguments we came back from", "× 4"], ["Reasons I still call you", "× ALL"]],
  },
  month: {
    warm: [["Small wins I almost missed", "× 11"], ["Slow mornings", "× 7"], ["People who made it lighter", "× 5"], ["Proof I kept going", "× DAILY"]],
    funny: [["Tabs left open", "× 63"], ["I deserve a treat moments", "× 19"], ["Plans moved to next week", "× 8"], ["Main character minutes", "× 404"]],
    honest: [["Days I felt behind", "× 6"], ["Boundaries I finally kept", "× 3"], ["Things I outgrew", "× 4"], ["Courage nobody saw", "× ENOUGH"]],
  },
  trip: {
    warm: [["New roads taken", "× 14"], ["Golden-hour stops", "× 6"], ["Meals worth remembering", "× 9"], ["Stories brought home", "× FOREVER"]],
    funny: [["Wrong turns that became lore", "× 5"], ["Photos nobody can post", "× 38"], ["Where should we eat debates", "× 17"], ["Actual itinerary followed", "× 0"]],
    honest: [["Moments we felt free", "× 8"], ["Things the road taught us", "× 5"], ["Quiet views shared", "× 12"], ["Distance from the old us", "× FAR"]],
  },
  work: {
    warm: [["Tiny progress made", "× 23"], ["Teammates who had my back", "× 4"], ["Ideas worth protecting", "× 7"], ["Reasons to keep building", "× MANY"]],
    funny: [["Meetings that could be texts", "× 11"], ["Coffee-based decisions", "× 27"], ["Final_v8_REAL files", "× 16"], ["Times we said quick sync", "× TOO MANY"]],
    honest: [["Things I carried quietly", "× 6"], ["No's I needed to say", "× 3"], ["Work I'm genuinely proud of", "× 5"], ["Energy left in the tank", "× 2%"]],
  },
  era: {
    warm: [["Soft choices made", "× 8"], ["Things that feel like home", "× 12"], ["Versions of me welcomed", "× 4"], ["Hope currently in stock", "× PLENTY"]],
    funny: [["Personality rebrands", "× 3"], ["New hobbies hyperfixated", "× 7"], ["Signs from the universe", "× 22"], ["Explanations I owe", "× 0"]],
    honest: [["Old patterns noticed", "× 9"], ["People-pleasing returned", "× 2"], ["Times I chose myself", "× 6"], ["Becoming who I needed", "× NOW"]],
  },
};

const totals: Record<Tone, string[]> = {
  warm: ["Still adding up.", "Worth every moment.", "More than I can count."],
  funny: ["Emotionally over budget.", "No refunds, obviously.", "Somehow still iconic."],
  honest: ["It mattered anyway.", "Not perfect. Still mine.", "Paid in becoming."],
};

const accentHex: Record<Accent, string> = { coral: "#c05940", sage: "#477c69", ink: "#292b27", mustard: "#c08a2c", lavender: "#7663a5", blue: "#3e6f91" };
const stickerAssets = [
  { symbol: "♡", label: "Heart" }, { symbol: "✦", label: "Spark" }, { symbol: "✿", label: "Flower" }, { symbol: "☻", label: "Smile" },
  { symbol: "OURS", label: "Ours" }, { symbol: "+ YOU", label: "You" }, { symbol: "GOOD DAY", label: "Good day" }, { symbol: "PAID", label: "Paid" },
];
const photoFilters: Array<{ id: PhotoFilter; label: string; css: string }> = [
  { id: "original", label: "Original", css: "" },
  { id: "warm", label: "Warm", css: "sepia(.18) saturate(1.14) hue-rotate(-8deg)" },
  { id: "film", label: "Film", css: "sepia(.22) contrast(1.08) saturate(.86)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "dream", label: "Dream", css: "brightness(1.06) saturate(1.22) contrast(.94)" },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function randomStickerTilt() {
  return Math.round(Math.random() * 12) - 6;
}

function encodeStory(story: SharedStory) {
  const bytes = new TextEncoder().encode(JSON.stringify(story));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeStory(value: string): SharedStory | null {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharedStory;
  } catch {
    return null;
  }
}

export default function StoriesHome() {
  const [kind, setKind] = useState<StoryKind>("friendship");
  const [names, setNames] = useState("Mook & Ploy");
  const [note, setNote] = useState("We survived growing up without growing apart.");
  const [tone, setTone] = useState<Tone>("warm");
  const [decoration, setDecoration] = useState<Decoration>("classic");
  const [accent, setAccent] = useState<Accent>("coral");
  const [activeTool, setActiveTool] = useState<ToolTab>("content");
  const [fontStyle, setFontStyle] = useState<FontStyle>("editorial");
  const [paperTone, setPaperTone] = useState<PaperTone>("cream");
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("torn");
  const [textScale, setTextScale] = useState(1.08);
  const [stickers, setStickers] = useState<DiySticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [draggingStickerId, setDraggingStickerId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [customStickerText, setCustomStickerText] = useState("");
  const [items, setItems] = useState<StoryItem[]>(() => storyLines.friendship.warm.map(([label, quantity]) => ({ id: makeId(), label, quantity })));
  const [total, setTotal] = useState("Still adding up.");
  const [edition, setEdition] = useState(824);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newLine, setNewLine] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadedFromShare, setLoadedFromShare] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("original");
  const [photoBrightness, setPhotoBrightness] = useState(100);
  const [photoContrast, setPhotoContrast] = useState(100);
  const [photoSaturation, setPhotoSaturation] = useState(100);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoError, setPhotoError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLElement>(null);

  const activeKind = useMemo(() => kinds.find((entry) => entry.id === kind) ?? kinds[0], [kind]);
  const activePhotoFilter = photoFilters.find((entry) => entry.id === photoFilter)?.css ?? "";
  const photoFilterStyle = `${activePhotoFilter} brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)`.trim();
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId) ?? null;
  const story: SharedStory = { kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale, stickers, items, total, edition };

  // A URL fragment is never sent to the server, so a shared story cannot be known
  // during SSR. Seeding this state in the initializers would desync hydration, which
  // makes applying it once after mount the only correct option here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const match = window.location.hash.match(/^#s=([^&]+)/);
    if (!match) return;
    const shared = decodeStory(match[1]);
    if (!shared) return;
    setKind(shared.kind); setNames(shared.names); setNote(shared.note); setTone(shared.tone);
    setDecoration(shared.decoration ?? "classic"); setAccent(shared.accent ?? "coral");
    setFontStyle(shared.fontStyle ?? "editorial"); setPaperTone(shared.paperTone ?? "cream"); setEdgeStyle(shared.edgeStyle ?? "torn");
    setTextScale(shared.textScale ?? 1.08); setStickers(shared.stickers ?? []);
    setItems(shared.items); setTotal(shared.total); setEdition(shared.edition); setLoadedFromShare(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (addOpen) { addInputRef.current?.focus(); }
  }, [addOpen]);

  function chooseKind(next: StoryKind) {
    const selected = kinds.find((entry) => entry.id === next);
    setKind(next);
    if (selected) setNames(selected.prompt);
  }

  function generateStory(nextTone = tone) {
    setIsGenerating(true);
    window.setTimeout(() => {
      const lines = storyLines[kind][nextTone];
      setItems(lines.map(([label, quantity]) => ({ id: makeId(), label, quantity })));
      const choices = totals[nextTone];
      setTotal(choices[(edition + kind.length + nextTone.length) % choices.length]);
      setEdition((current) => current + 1);
      setTone(nextTone);
      setLoadedFromShare(false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setIsGenerating(false);
    }, 650);
  }

  function addLineItem() {
    if (!newLine.trim()) return;
    setItems((current) => [...current, { id: makeId(), label: newLine.trim(), quantity: "× +1" }]);
    setNewLine(""); setAddOpen(false);
  }

  function updateLineItem(id: string, key: "label" | "quantity", value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  function removeLineItem(id: string) {
    setItems((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current);
  }

  function reorderLineItem(targetId: string) {
    if (!draggedItemId || draggedItemId === targetId) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === draggedItemId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next;
    });
    setDraggedItemId(null);
  }

  function addSticker(symbol: string, label: string, x = 50, y = 32) {
    const sticker = { id: makeId(), symbol, label, x, y, size: symbol.length > 3 ? 14 : 26, rotation: randomStickerTilt() };
    setStickers((current) => [...current, sticker]); setSelectedStickerId(sticker.id); setActiveTool("stickers");
  }

  function updateSelectedSticker(patch: Partial<DiySticker>) {
    if (!selectedStickerId) return;
    setStickers((current) => current.map((sticker) => sticker.id === selectedStickerId ? { ...sticker, ...patch } : sticker));
  }

  function removeSelectedSticker() {
    if (!selectedStickerId) return;
    setStickers((current) => current.filter((sticker) => sticker.id !== selectedStickerId)); setSelectedStickerId(null);
  }

  function positionSticker(id: string, clientX: number, clientY: number) {
    const receipt = receiptRef.current; if (!receipt) return;
    const bounds = receipt.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(96, ((clientY - bounds.top) / bounds.height) * 100));
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

  function handlePhotoFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose an image file."); return; }
    if (file.size > 15 * 1024 * 1024) { setPhotoError("Please choose an image smaller than 15 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(String(reader.result)); setPhotoName(file.name || "Camera photo"); setPhotoError("");
      setPhotoFilter("original"); setPhotoBrightness(100); setPhotoContrast(100); setPhotoSaturation(100); setPhotoZoom(1);
    };
    reader.onerror = () => setPhotoError("That photo could not be opened. Please try another one.");
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoData(null); setPhotoName(""); setPhotoError("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  async function downloadStory() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) return;
    const selectedAccent = accentHex[accent];
    const selectedPaper = paperTone === "white" ? "#ffffff" : paperTone === "blush" ? "#fff5f0" : paperTone === "sage" ? "#f5fbf5" : decoration === "botanical" ? "#fbfff8" : "#fffdf7";
    const displayFont = fontStyle === "mono" ? "monospace" : fontStyle === "rounded" ? "sans-serif" : "Georgia";
    context.fillStyle = decoration === "botanical" ? "#e0ebe2" : decoration === "mono" ? "#e5e3dc" : "#efddd2"; context.fillRect(0, 0, 1080, 1920);
    context.fillStyle = selectedPaper; context.shadowColor = "rgba(50,40,25,.18)"; context.shadowBlur = 40; context.fillRect(120, 70, 840, 1780); context.shadowBlur = 0;
    context.fillStyle = "#2a2c28"; context.font = "700 24px monospace"; context.fillText("PAPERMINT STORIES", 180, 185); context.textAlign = "right"; context.fillText(`NO. ${String(edition).padStart(4, "0")}`, 900, 185); context.textAlign = "center";
    context.strokeStyle = selectedAccent; context.lineWidth = 3; context.beginPath(); context.arc(540, 290, 58, 0, Math.PI * 2); context.stroke(); context.fillStyle = selectedAccent; context.font = decoration === "mono" ? "700 58px monospace" : "italic 70px Georgia"; context.fillText("P", 540, 313);
    context.fillStyle = "#2a2c28"; context.font = `${Math.round(56 * textScale)}px ${displayFont}`; context.fillText(activeKind.label, 540, 410);
    context.fillStyle = selectedAccent; context.font = `${fontStyle === "editorial" ? "italic " : ""}${Math.round(34 * textScale)}px ${displayFont}`; context.fillText(names.slice(0, 38) || "Your story", 540, 465);
    context.strokeStyle = "#bdb5a8"; context.setLineDash([8, 8]); context.beginPath(); context.moveTo(180, 530); context.lineTo(900, 530); context.stroke(); context.setLineDash([]);
    if (photoData) {
      const image = new Image(); image.src = photoData;
      try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Photo could not be rendered")); }); }
      catch { setPhotoError("The edited photo could not be exported. Please replace it and try again."); return; }
      const frameX = 180, frameY = 565, frameW = 720, frameH = 330;
      const scale = Math.max(frameW / image.naturalWidth, frameH / image.naturalHeight) * photoZoom;
      const drawW = image.naturalWidth * scale, drawH = image.naturalHeight * scale;
      context.save(); context.beginPath(); context.rect(frameX, frameY, frameW, frameH); context.clip(); context.filter = photoFilterStyle;
      context.drawImage(image, frameX + (frameW - drawW) / 2, frameY + (frameH - drawH) / 2, drawW, drawH); context.restore();
      context.strokeStyle = selectedAccent; context.lineWidth = 3; context.strokeRect(frameX, frameY, frameW, frameH);
    }
    context.textAlign = "left"; context.font = "25px monospace";
    const itemStartY = photoData ? 990 : 630;
    const exportItems = items.slice(0, photoData ? 4 : 7);
    exportItems.forEach((item, index) => { const y = itemStartY + index * 115; context.fillStyle = "#343631"; context.fillText(item.label.slice(0, 34), 190, y); context.textAlign = "right"; context.font = "700 25px monospace"; context.fillText(item.quantity.slice(0, 12), 890, y); context.textAlign = "left"; context.font = "25px monospace"; });
    const totalY = itemStartY + exportItems.length * 115 + 20; context.fillStyle = "#2a2c28"; context.fillRect(180, totalY, 720, 4); context.font = "700 22px monospace"; context.fillText("TOTAL", 190, totalY + 75); context.textAlign = "right"; context.font = "italic 44px Georgia"; context.fillText(total.slice(0, 30), 890, totalY + 75); context.textAlign = "center";
    context.strokeStyle = selectedAccent; context.lineWidth = 4; context.beginPath(); context.arc(540, totalY + 220, 93, 0, Math.PI * 2); context.stroke(); context.fillStyle = selectedAccent; context.font = "700 19px monospace"; context.fillText("STILL", 540, totalY + 205); context.fillText("ADDING UP", 540, totalY + 237);
    context.fillStyle = "#77736b"; context.font = "20px monospace"; context.fillText("NOT A FINANCIAL DOCUMENT · JUST PROOF IT MATTERED", 540, photoData ? 1820 : 1700);
    stickers.forEach((sticker) => {
      context.save(); context.translate(120 + sticker.x / 100 * 840, 70 + sticker.y / 100 * 1780); context.rotate(sticker.rotation * Math.PI / 180);
      context.fillStyle = selectedAccent; context.textAlign = "center"; context.textBaseline = "middle";
      context.font = `700 ${Math.round(sticker.size * 2.5)}px ${sticker.symbol.length > 3 ? "monospace" : "sans-serif"}`; context.fillText(sticker.symbol, 0, 0); context.restore();
    });
    const link = document.createElement("a"); link.download = `papermint-${kind}-${edition}.png`; link.href = canvas.toDataURL("image/png"); link.click();
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

          {activeTool === "content" && <section className="diy-panel" aria-label="Receipt content">
            <div className="diy-panel-heading"><div><strong>Build your story</strong><small>Drag line items to reorder them.</small></div><button type="button" disabled={isGenerating} onClick={() => generateStory()}>{isGenerating ? "Printing…" : "↻ Generate"}</button></div>
            <label className="diy-field"><span>STORY TYPE</span><div className="story-types" aria-label="Choose a story type">{kinds.map((entry) => <button key={entry.id} type="button" className={kind === entry.id ? "active" : ""} aria-pressed={kind === entry.id} onClick={() => chooseKind(entry.id)}><span>{entry.icon}</span>{entry.label}</button>)}</div></label>
            <label className="diy-field"><span>SUBJECT</span><input value={names} onChange={(event) => setNames(event.target.value)} /></label>
            <label className="diy-field"><span>ONE-LINE NOTE</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <div className="diy-items-heading"><span>LINE ITEMS</span><button type="button" onClick={() => setItems((current) => [...current,{id:makeId(),label:"A new memory",quantity:"× +1"}])}>＋ Add</button></div>
            <div className="diy-item-list">{items.map((item) => <div key={item.id} className="diy-item-row" draggable onDragStart={() => setDraggedItemId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderLineItem(item.id)}><span className="drag-grip" aria-hidden="true">⠿</span><input aria-label="Line item" value={item.label} onChange={(event) => updateLineItem(item.id,"label",event.target.value)} /><input aria-label="Quantity" value={item.quantity} onChange={(event) => updateLineItem(item.id,"quantity",event.target.value)} /><button type="button" aria-label="Remove line item" onClick={() => removeLineItem(item.id)}>×</button></div>)}</div>
          </section>}

          {activeTool === "style" && <section className="diy-panel" aria-label="Receipt style">
            <div className="diy-panel-heading"><div><strong>Make it look yours</strong><small>Every option updates the canvas live.</small></div></div>
            <div className="diy-option"><span>TEMPLATE</span><div className="diy-choice-grid four">{(["classic","botanical","mono","playful"] as Decoration[]).map((entry) => <button type="button" key={entry} className={decoration === entry ? "active" : ""} onClick={() => setDecoration(entry)}><i>{entry === "classic" ? "P" : entry === "botanical" ? "❦" : entry === "mono" ? "M" : "☺"}</i><b>{entry}</b></button>)}</div></div>
            <div className="diy-option"><span>PAPER</span><div className="diy-choice-grid four paper-choices">{(["cream","white","blush","sage"] as PaperTone[]).map((entry) => <button type="button" key={entry} className={`${entry} ${paperTone === entry ? "active" : ""}`} onClick={() => setPaperTone(entry)}><i /><b>{entry}</b></button>)}</div></div>
            <div className="diy-option"><span>FONT</span><div className="diy-segments">{(["editorial","rounded","mono"] as FontStyle[]).map((entry) => <button type="button" key={entry} className={fontStyle === entry ? "active" : ""} onClick={() => setFontStyle(entry)}>{entry}</button>)}</div></div>
            <div className="diy-option"><span>EDGE</span><div className="diy-segments">{(["torn","straight","rounded"] as EdgeStyle[]).map((entry) => <button type="button" key={entry} className={edgeStyle === entry ? "active" : ""} onClick={() => setEdgeStyle(entry)}>{entry}</button>)}</div></div>
            <div className="diy-option"><span>ACCENT COLOR</span><div className="designer-colors diy-colors">{(["coral","sage","ink","mustard","lavender","blue"] as Accent[]).map((entry) => <button type="button" key={entry} className={`${entry} ${accent === entry ? "active" : ""}`} aria-label={`${entry} accent`} onClick={() => setAccent(entry)} />)}</div></div>
            <div className="diy-option"><span>STORY MOOD</span><div className="diy-segments mood-segments">{(["warm","funny","honest"] as Tone[]).map((entry) => <button type="button" key={entry} className={tone === entry ? "active" : ""} onClick={() => generateStory(entry)}>{entry}</button>)}</div></div>
            <label className="diy-range"><span>TEXT SIZE <b>{Math.round(textScale * 100)}%</b></span><input type="range" min="0.9" max="1.35" step="0.05" value={textScale} onChange={(event) => setTextScale(Number(event.target.value))} /></label>
          </section>}

          {activeTool === "photo" && <section className="photo-studio diy-panel" aria-labelledby="photo-studio-title">
            <div className="diy-panel-heading"><div><strong id="photo-studio-title">Add & edit a photo</strong><small>Camera, upload, filters and adjustments.</small></div><span className="device-pill">DEVICE-ONLY</span></div>
            <input ref={cameraInputRef} className="photo-file-input" type="file" accept="image/*" capture="environment" onChange={(event) => handlePhotoFile(event.target.files?.[0])} />
            <input ref={uploadInputRef} className="photo-file-input" type="file" accept="image/*" onChange={(event) => handlePhotoFile(event.target.files?.[0])} />
            {!photoData ? (
              <div className="photo-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handlePhotoFile(event.dataTransfer.files?.[0]); }}>
                <span className="photo-drop-icon">◎</span>
                <div><strong>Add the moment behind the story</strong><small>Take a new photo or choose one from your device.</small></div>
                <div className="photo-source-actions"><button type="button" onClick={() => cameraInputRef.current?.click()}>◉ Camera</button><button type="button" onClick={() => uploadInputRef.current?.click()}>↑ Upload</button></div>
              </div>
            ) : (
              <div className="photo-editor">
                <div className="photo-editor-thumb"><img src={photoData} alt="Selected story moment" style={{ filter: photoFilterStyle, transform: `scale(${photoZoom})` }} /><button type="button" onClick={removePhoto} aria-label="Remove photo">×</button><span>{photoName}</span></div>
                <div className="photo-filter-list" aria-label="Photo filters">
                  {photoFilters.map((entry) => <button type="button" key={entry.id} className={photoFilter === entry.id ? "active" : ""} aria-pressed={photoFilter === entry.id} onClick={() => setPhotoFilter(entry.id)}><i style={{ backgroundImage: `url(${photoData})`, filter: `${entry.css} brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)` }} /><span>{entry.label}</span></button>)}
                </div>
                <div className="photo-adjustments">
                  <label><span>Brightness <b>{photoBrightness}</b></span><input type="range" min="70" max="130" value={photoBrightness} onChange={(event) => setPhotoBrightness(Number(event.target.value))} /></label>
                  <label><span>Contrast <b>{photoContrast}</b></span><input type="range" min="70" max="140" value={photoContrast} onChange={(event) => setPhotoContrast(Number(event.target.value))} /></label>
                  <label><span>Color <b>{photoSaturation}</b></span><input type="range" min="0" max="160" value={photoSaturation} onChange={(event) => setPhotoSaturation(Number(event.target.value))} /></label>
                  <label><span>Zoom <b>{photoZoom.toFixed(1)}×</b></span><input type="range" min="1" max="1.8" step="0.1" value={photoZoom} onChange={(event) => setPhotoZoom(Number(event.target.value))} /></label>
                </div>
                <div className="photo-replace-actions"><button type="button" onClick={() => cameraInputRef.current?.click()}>Retake</button><button type="button" onClick={() => uploadInputRef.current?.click()}>Replace photo</button></div>
              </div>
            )}
            {photoError && <p className="photo-error" role="alert">{photoError}</p>}
          </section>}

          {activeTool === "stickers" && <section className="diy-panel" aria-label="Sticker tools">
            <div className="diy-panel-heading"><div><strong>Drag something fun</strong><small>Drag onto the receipt, or click to add.</small></div><span className="device-pill">{stickers.length} ADDED</span></div>
            <div className="sticker-palette">{stickerAssets.map((asset) => <button type="button" draggable key={asset.label} onDragStart={(event) => { event.dataTransfer.setData("application/x-papermint-symbol",asset.symbol); event.dataTransfer.setData("application/x-papermint-label",asset.label); }} onClick={() => addSticker(asset.symbol,asset.label)}><span>{asset.symbol}</span><b>{asset.label}</b><small>Drag me</small></button>)}</div>
            <div className="custom-sticker"><input maxLength={12} value={customStickerText} onChange={(event) => setCustomStickerText(event.target.value)} placeholder="Your own text" /><button type="button" onClick={() => { if (customStickerText.trim()) { addSticker(customStickerText.trim().toUpperCase(),"Custom text"); setCustomStickerText(""); } }}>＋ Add text</button></div>
            {selectedSticker ? <div className="sticker-inspector"><div><strong>Edit selected sticker</strong><small>{selectedSticker.label}</small></div><label><span>SIZE <b>{selectedSticker.size}px</b></span><input type="range" min="12" max="48" value={selectedSticker.size} onChange={(event) => updateSelectedSticker({size:Number(event.target.value)})} /></label><label><span>ROTATE <b>{selectedSticker.rotation}°</b></span><input type="range" min="-30" max="30" value={selectedSticker.rotation} onChange={(event) => updateSelectedSticker({rotation:Number(event.target.value)})} /></label><button type="button" onClick={removeSelectedSticker}>Remove sticker</button></div> : <div className="sticker-empty"><span>↗</span><p>Select a sticker on the receipt to resize or rotate it.</p></div>}
          </section>}
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
