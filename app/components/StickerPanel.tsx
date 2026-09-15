import { stickerAssets } from "../data/story";
import type { DiySticker } from "../types";

type StickerPanelProps = {
  stickers: DiySticker[];
  selectedSticker: DiySticker | null;
  customStickerText: string;
  setCustomStickerText: (value: string) => void;
  addSticker: (symbol: string, label: string) => void;
  updateSelectedSticker: (patch: Partial<DiySticker>) => void;
  removeSelectedSticker: () => void;
};

export function StickerPanel({
  stickers, selectedSticker, customStickerText, setCustomStickerText,
  addSticker, updateSelectedSticker, removeSelectedSticker,
}: StickerPanelProps) {
  return (
    <section className="diy-panel" aria-label="Sticker tools">
      <div className="diy-panel-heading"><div><strong>Drag something fun</strong><small>Drag onto the receipt, or click to add.</small></div><span className="device-pill">{stickers.length} ADDED</span></div>
      <div className="sticker-palette">{stickerAssets.map((asset) => <button type="button" draggable key={asset.label} onDragStart={(event) => { event.dataTransfer.setData("application/x-papermint-symbol",asset.symbol); event.dataTransfer.setData("application/x-papermint-label",asset.label); }} onClick={() => addSticker(asset.symbol,asset.label)}><span>{asset.symbol}</span><b>{asset.label}</b><small>Drag me</small></button>)}</div>
      <div className="custom-sticker"><input maxLength={12} value={customStickerText} onChange={(event) => setCustomStickerText(event.target.value)} placeholder="Your own text" /><button type="button" onClick={() => { if (customStickerText.trim()) { addSticker(customStickerText.trim().toUpperCase(),"Custom text"); setCustomStickerText(""); } }}>＋ Add text</button></div>
      {selectedSticker ? <div className="sticker-inspector"><div><strong>Edit selected sticker</strong><small>{selectedSticker.label}</small></div><label><span>SIZE <b>{selectedSticker.size}px</b></span><input type="range" min="12" max="48" value={selectedSticker.size} onChange={(event) => updateSelectedSticker({size:Number(event.target.value)})} /></label><label><span>ROTATE <b>{selectedSticker.rotation}°</b></span><input type="range" min="-30" max="30" value={selectedSticker.rotation} onChange={(event) => updateSelectedSticker({rotation:Number(event.target.value)})} /></label><button type="button" onClick={removeSelectedSticker}>Remove sticker</button></div> : <div className="sticker-empty"><span>↗</span><p>Select a sticker on the receipt to resize or rotate it.</p></div>}
    </section>
  );
}
