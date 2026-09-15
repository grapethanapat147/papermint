import { accentHex } from "../data/story";
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
};

/**
 * Paints the receipt onto a 1080x1920 canvas and triggers the PNG download.
 * Kept in sync with the visible preview by hand — any new editable element
 * must be drawn here too.
 */
export async function downloadStory(
  snapshot: StorySnapshot,
  onPhotoError: (message: string) => void,
) {
  const {
    kind, edition, accent, paperTone, decoration, fontStyle, textScale,
    activeKind, names, total, items, stickers, photoData, photoZoom, photoOffsetX, photoOffsetY, photoFilterStyle,
  } = snapshot;
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
