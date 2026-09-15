import { kinds } from "../data/story";
import type { StoryItem, StoryKind, Tone } from "../types";

type ContentPanelProps = {
  isGenerating: boolean;
  generateStory: (tone?: Tone) => void;
  kind: StoryKind;
  chooseKind: (kind: StoryKind) => void;
  names: string;
  setNames: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  items: StoryItem[];
  appendLineItem: (label: string) => void;
  updateLineItem: (id: string, key: "label" | "quantity", value: string) => void;
  removeLineItem: (id: string) => void;
  /** Drag-to-reorder: the row picked up, then the row dropped on. */
  setDraggedItemId: (id: string | null) => void;
  reorderLineItem: (targetId: string) => void;
};

export function ContentPanel({
  isGenerating, generateStory, kind, chooseKind, names, setNames, note, setNote,
  items, appendLineItem, updateLineItem, removeLineItem, setDraggedItemId, reorderLineItem,
}: ContentPanelProps) {
  return (
    <section className="diy-panel" aria-label="Receipt content">
      <div className="diy-panel-heading"><div><strong>Build your story</strong><small>Drag line items to reorder them.</small></div><button type="button" disabled={isGenerating} onClick={() => generateStory()}>{isGenerating ? "Printing…" : "↻ Generate"}</button></div>
      <label className="diy-field"><span>STORY TYPE</span><div className="story-types" aria-label="Choose a story type">{kinds.map((entry) => <button key={entry.id} type="button" className={kind === entry.id ? "active" : ""} aria-pressed={kind === entry.id} onClick={() => chooseKind(entry.id)}><span>{entry.icon}</span>{entry.label}</button>)}</div></label>
      <label className="diy-field"><span>SUBJECT</span><input value={names} onChange={(event) => setNames(event.target.value)} /></label>
      <label className="diy-field"><span>ONE-LINE NOTE</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="diy-items-heading"><span>LINE ITEMS</span><button type="button" onClick={() => appendLineItem("A new memory")}>＋ Add</button></div>
      <div className="diy-item-list">{items.map((item) => <div key={item.id} className="diy-item-row" draggable onDragStart={() => setDraggedItemId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderLineItem(item.id)}><span className="drag-grip" aria-hidden="true">⠿</span><input aria-label="Line item" value={item.label} onChange={(event) => updateLineItem(item.id,"label",event.target.value)} /><input aria-label="Quantity" value={item.quantity} onChange={(event) => updateLineItem(item.id,"quantity",event.target.value)} /><button type="button" aria-label="Remove line item" onClick={() => removeLineItem(item.id)}>×</button></div>)}</div>
    </section>
  );
}
