import { accentHex, receiptChrome } from "../data/story";
import type { Accent, Decoration, DiySticker, FontStyle, PaperTone, StoryItem, StoryKind } from "../types";

/** Everything downloadStory needs to paint the receipt, snapshotted from editor state. */
export type StorySnapshot = {
  kind: StoryKind;
  edition: number;
  accent: Accent;
  paperTone: PaperTone;
  decoration: Decoration;
  fontStyle: FontStyle;
  textScale: number;
  activeKind: { label: string };
  names: string;
  total: string;
  items: StoryItem[];
  stickers: DiySticker[];
  photoData: string | null;
  photoZoom: number;
  photoOffsetX: number;
  photoOffsetY: number;
  photoFilterStyle: string;
  note: string;
};

/** The receipt's own design space, independent of whatever canvas it lands on. */
const RECEIPT_X = 120;
const RECEIPT_Y = 70;
const RECEIPT_W = 840;
const RECEIPT_H = 1780;

export type ExportPresetId = "story" | "post" | "receipt";

/**
 * Every preset draws the same receipt and scales the whole thing to fit, so no
 * size loses content or re-flows — what is on screen is what lands in the file.
 */
export const exportPresets: Record<ExportPresetId, {
  label: string; hint: string; width: number; height: number; padding: number; backdrop: boolean;
}> = {
  story: { label: "Story", hint: "9:16", width: 1080, height: 1920, padding: 70, backdrop: true },
  post: { label: "Post", hint: "4:5", width: 1080, height: 1350, padding: 60, backdrop: true },
  receipt: { label: "Receipt only", hint: "no backdrop", width: RECEIPT_W, height: RECEIPT_H, padding: 0, backdrop: false },
};

/**
 * Paints the receipt onto a 1080x1920 canvas and triggers the PNG download.
 * Kept in sync with the visible preview by hand — any new editable element
 * must be drawn here too.
 */
export async function downloadStory(
  snapshot: StorySnapshot,
  onPhotoError: (message: string) => void,
  presetId: ExportPresetId = "story",
) {
  const {
    kind, edition, accent, paperTone, decoration, fontStyle, textScale,
    activeKind, names, note, total, items, stickers, photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle,
  } = snapshot;
  // Drawn at the original absolute coordinates on a transparent surface, then
  // composited into the chosen preset. Keeping the coordinates untouched is why
  // the Story output is byte-for-byte what it always was.
  const plate = document.createElement("canvas");
  plate.width = 1080; plate.height = 1920;
  const context = plate.getContext("2d");
  if (!context) return;
  const selectedAccent = accentHex[accent];
  const selectedPaper = paperTone === "white" ? "#ffffff" : paperTone === "blush" ? "#fff5f0" : paperTone === "sage" ? "#f5fbf5" : decoration === "botanical" ? "#fbfff8" : "#fffdf7";
  const displayFont = fontStyle === "mono" ? "monospace" : fontStyle === "rounded" ? "sans-serif" : "Georgia";
  context.fillStyle = selectedPaper; context.fillRect(RECEIPT_X, RECEIPT_Y, RECEIPT_W, RECEIPT_H);
  context.fillStyle = "#2a2c28"; context.font = "700 24px monospace"; context.fillText("PAPERMINT STORIES", 180, 185); context.textAlign = "right"; context.fillText(`NO. ${String(edition).padStart(4, "0")}`, 900, 185); context.textAlign = "center";
  context.strokeStyle = selectedAccent; context.lineWidth = 3; context.beginPath(); context.arc(540, 290, 58, 0, Math.PI * 2); context.stroke(); context.fillStyle = selectedAccent; context.font = decoration === "mono" ? "700 58px monospace" : "italic 70px Georgia"; context.fillText("P", 540, 313);
  context.fillStyle = "#2a2c28"; context.font = `${Math.round(56 * textScale)}px ${displayFont}`; context.fillText(activeKind.label, 540, 410);
  context.fillStyle = selectedAccent; context.font = `${fontStyle === "editorial" ? "italic " : ""}${Math.round(34 * textScale)}px ${displayFont}`; context.fillText(names.slice(0, 38) || "Your story", 540, 465);
  context.fillStyle = "#77736b"; context.font = "18px monospace";
  context.textAlign = "left"; context.fillText(receiptChrome.issuedLabel, 180, 505);
  context.textAlign = "right"; context.fillText(receiptChrome.issuedOn, 900, 505);
  context.textAlign = "center";
  context.strokeStyle = "#bdb5a8"; context.setLineDash([8, 8]); context.beginPath(); context.moveTo(180, 530); context.lineTo(900, 530); context.stroke(); context.setLineDash([]);
  if (photoData) {
    const image = new Image(); image.src = photoData;
    try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Photo could not be rendered")); }); }
    catch { onPhotoError("The edited photo could not be exported. Please replace it and try again."); return; }
    const frameX = 180, frameY = 565, frameW = 720, frameH = 330;
    const scale = Math.max(frameW / image.naturalWidth, frameH / image.naturalHeight) * photoZoom;
    const drawW = image.naturalWidth * scale, drawH = image.naturalHeight * scale;
    context.save(); context.beginPath(); context.rect(frameX, frameY, frameW, frameH); context.clip(); context.filter = photoFilterStyle;
    // Mirrors the preview's `scale() translate(%)`: the shift is a percentage of
    // the drawn photo, so both surfaces crop to the same place.
    const shiftX = (photoOffsetX / 100) * drawW;
    const shiftY = (photoOffsetY / 100) * drawH;
    context.drawImage(image, frameX + (frameW - drawW) / 2 + shiftX, frameY + (frameH - drawH) / 2 + shiftY, drawW, drawH); context.restore();
    context.strokeStyle = selectedAccent; context.lineWidth = 3; context.strokeRect(frameX, frameY, frameW, frameH);
    context.fillStyle = "#77736b"; context.font = "18px monospace"; context.textAlign = "center";
    context.fillText(receiptChrome.photoCaption, 540, frameY + frameH + 34);
  }
  context.textAlign = "left"; context.font = "25px monospace";
  const itemStartY = photoData ? 990 : 630;
  const exportItems = items.slice(0, photoData ? 4 : 7);
  exportItems.forEach((item, index) => { const y = itemStartY + index * 115; context.fillStyle = "#343631"; context.fillText(item.label.slice(0, 34), 190, y); context.textAlign = "right"; context.font = "700 25px monospace"; context.fillText(item.quantity.slice(0, 12), 890, y); context.textAlign = "left"; context.font = "25px monospace"; });
  const totalY = itemStartY + exportItems.length * 115 + 20; context.fillStyle = "#2a2c28"; context.fillRect(180, totalY, 720, 4); context.font = "700 22px monospace"; context.fillText("TOTAL", 190, totalY + 75); context.textAlign = "right"; context.font = "italic 44px Georgia"; context.fillText(total.slice(0, 30), 890, totalY + 75); context.textAlign = "center";
  // Sits between the total rule and the stamp, which is the only gap wide enough
  // at every item count. On screen it sits beside the stamp instead.
  context.textAlign = "center"; context.fillStyle = "#343631";
  context.font = `${fontStyle === "editorial" ? "italic " : ""}24px ${displayFont}`;
  context.fillText((note || receiptChrome.fallbackNote).slice(0, 46), 540, totalY + 78);
  context.strokeStyle = selectedAccent; context.lineWidth = 4; context.beginPath(); context.arc(540, totalY + 220, 93, 0, Math.PI * 2); context.stroke(); context.fillStyle = selectedAccent; context.font = "700 19px monospace"; context.fillText("STILL", 540, totalY + 205); context.fillText("ADDING UP", 540, totalY + 237);
  context.fillStyle = "#77736b"; context.font = "20px monospace"; context.fillText("NOT A FINANCIAL DOCUMENT · JUST PROOF IT MATTERED", 540, photoData ? 1820 : 1700);
  stickers.forEach((sticker) => {
    context.save(); context.translate(120 + sticker.x / 100 * 840, 70 + sticker.y / 100 * 1780); context.rotate(sticker.rotation * Math.PI / 180);
    context.fillStyle = selectedAccent; context.textAlign = "center"; context.textBaseline = "middle";
    context.font = `700 ${Math.round(sticker.size * 2.5)}px ${sticker.symbol.length > 3 ? "monospace" : "sans-serif"}`; context.fillText(sticker.symbol, 0, 0); context.restore();
  });
  // Decorative barcode, matching the .life-barcode strip on screen.
  const barcodeY = photoData ? 1762 : 1642;
  context.fillStyle = "#2a2c28";
  for (let x = 180, seed = edition; x < 900; seed = (seed * 1103515245 + 12345) & 0x7fffffff) {
    const width = 3 + (seed % 4) * 2;
    context.fillRect(x, barcodeY, width, 34);
    x += width + 4 + (seed % 3);
  }

  const preset = exportPresets[presetId];
  const target = document.createElement("canvas");
  target.width = preset.width; target.height = preset.height;
  const out = target.getContext("2d");
  if (!out) return;

  if (preset.backdrop) {
    out.fillStyle = decoration === "botanical" ? "#e0ebe2" : decoration === "mono" ? "#e5e3dc" : "#efddd2";
    out.fillRect(0, 0, preset.width, preset.height);
  }

  // Whole-receipt scale-to-fit: no preset re-flows the layout or loses content.
  const scale = Math.min(
    (preset.width - preset.padding * 2) / RECEIPT_W,
    (preset.height - preset.padding * 2) / RECEIPT_H,
  );
  const drawnW = RECEIPT_W * scale;
  const drawnH = RECEIPT_H * scale;
  const destX = (preset.width - drawnW) / 2;
  const destY = (preset.height - drawnH) / 2;

  if (preset.backdrop) {
    out.save();
    out.shadowColor = "rgba(50,40,25,.18)"; out.shadowBlur = 40 * scale;
    out.fillStyle = selectedPaper; out.fillRect(destX, destY, drawnW, drawnH);
    out.restore();
  }
  out.drawImage(plate, RECEIPT_X, RECEIPT_Y, RECEIPT_W, RECEIPT_H, destX, destY, drawnW, drawnH);

  const link = document.createElement("a");
  link.download = `papermint-${kind}-${edition}-${presetId}.png`;
  link.href = target.toDataURL("image/png");
  link.click();
}
