import { useRef, useState, type FormEvent, type RefObject } from "react";

import { kinds, newLine, receiptChrome } from "../data/story";
import { MAX_DESCRIPTION } from "../lib/compose-shared";
import { isSampleName } from "../lib/remix";
import { TemplatePicker } from "./TemplatePicker";
import type { ReceiptTemplate } from "../types";
import type { StoryItem, StoryKind, Tone } from "../types";

type ContentPanelProps = {
  /** Lets a tap on the names printed on the receipt focus this field. */
  subjectInputRef: RefObject<HTMLInputElement | null>;
  /** Sends a description to Claude and lays the draft onto the receipt; throws a message to show. */
  composeStory: (description: string) => Promise<void>;
  isGenerating: boolean;
  generateStory: (tone?: Tone) => void;
  kind: StoryKind;
  chooseKind: (kind: StoryKind) => void;
  names: string;
  setNames: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  issued: string;
  setIssued: (value: string) => void;
  items: StoryItem[];
  appendLineItem: (label: string) => void;
  updateLineItem: (id: string, key: "label" | "quantity", value: string) => void;
  removeLineItem: (id: string) => void;
  templates: ReceiptTemplate[];
  templatesFull: boolean;
  applyTemplate: (template: ReceiptTemplate) => void;
  saveTemplate: (name: string) => void;
  deleteTemplate: (id: string) => void;
  /** Drag-to-reorder, driven by pointer events so it works with a finger too. */
  draggedItemId: string | null;
  setDraggedItemId: (id: string | null) => void;
  moveLineItem: (fromId: string, toId: string) => void;
  nudgeLineItem: (id: string, delta: -1 | 1) => void;
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

/**
 * The row index under the pointer, so a captured drag can tell what it is over.
 *
 * Index, not id: item ids come from Date.now() + Math.random(), so server and
 * client disagree on them and React refuses to patch up a mismatched attribute.
 * The position of a row is the same on both sides.
 */
function rowIndexAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const raw = el?.closest<HTMLElement>("[data-item-index]")?.dataset.itemIndex;
  return raw === undefined ? null : Number(raw);
}

export function ContentPanel({
  subjectInputRef, composeStory,
  isGenerating, generateStory, kind, chooseKind, names, setNames, note, setNote, issued, setIssued,
  items, appendLineItem, updateLineItem, removeLineItem,
  templates, templatesFull, applyTemplate, saveTemplate, deleteTemplate,
  draggedItemId, setDraggedItemId, moveLineItem, nudgeLineItem,
}: ContentPanelProps) {
  const sampleSubject = isSampleName(names);
  // Chrome and Safari clear a focus-time selection on the mouseup that follows.
  const selectedOnFocus = useRef(false);
  const [description, setDescription] = useState("");
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState("");

  async function submitDescription(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || composing) return;
    setComposing(true);
    setComposeError("");
    try {
      await composeStory(description.trim());
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Claude couldn't write this one. Try again.");
    } finally {
      setComposing(false);
    }
  }

  return (
    <section className="diy-panel" aria-label="Receipt content">
      <div className="diy-panel-heading"><div><strong>Build your story</strong><small>Drag line items to reorder them.</small></div><button type="button" disabled={isGenerating} onClick={() => generateStory()}>{isGenerating ? "Printing…" : "↻ Generate"}</button></div>
      {/* The fastest way to a receipt that is theirs: say what happened, Claude
          drafts the lines. Same rule as Remix — their own words are never replaced. */}
      <form className="ai-compose" onSubmit={submitDescription} aria-busy={composing}>
        <label htmlFor="ai-description">✦ Describe it, and Claude writes the lines</label>
        <textarea id="ai-description" rows={2} maxLength={MAX_DESCRIPTION} aria-describedby="ai-privacy" placeholder="e.g. ไปเชียงใหม่กับแก๊ง 3 วัน ฝนตกทุกวันแต่ขำทั้งทริป" value={description} onChange={(event) => setDescription(event.target.value)} />
        <div className="ai-compose-row"><small id="ai-privacy">Only this text is sent to Claude (Anthropic). Your photo never is.</small><button type="submit" disabled={composing || !description.trim()}>{composing ? "Writing\u2026" : "Write it"}</button></div>
        {composeError && <p className="photo-error" role="alert">{composeError}</p>}
      </form>
      {/* First, because putting their own names on it is the one step every receipt
          needs. While it still holds the example, a click selects it all so the
          first keystroke replaces it, and a hint says it is only an example. */}
      <label className="diy-field subject-field"><span>WHO OR WHAT IS IT ABOUT?</span><input
        ref={subjectInputRef}
        value={names}
        aria-describedby={sampleSubject ? "subject-hint" : undefined}
        onChange={(event) => setNames(event.target.value)}
        onFocus={(event) => { if (sampleSubject) { event.target.select(); selectedOnFocus.current = true; } }}
        onMouseUp={(event) => { if (selectedOnFocus.current) { event.preventDefault(); selectedOnFocus.current = false; } }}
        onBlur={() => { selectedOnFocus.current = false; }}
      /></label>
      {sampleSubject && <small className="field-hint" id="subject-hint">That&apos;s an example. Replace it with your own names or title.</small>}
      <label className="diy-field"><span>STORY TYPE</span><div className="story-types" aria-label="Choose a story type">{kinds.map((entry) => <button key={entry.id} type="button" className={kind === entry.id ? "active" : ""} aria-pressed={kind === entry.id} onClick={() => chooseKind(entry.id)}><span>{entry.icon}</span>{entry.label}</button>)}</div></label>
      <label className="diy-field"><span>ONE-LINE NOTE</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <label className="diy-field"><span>ISSUED ON</span><input value={issued} maxLength={24} placeholder={receiptChrome.issuedOn} onChange={(event) => setIssued(event.target.value)} /></label>
      <div className="diy-items-heading"><span>LINE ITEMS</span><button type="button" onClick={() => appendLineItem(newLine.label)}>＋ Add</button></div>
      <div className="diy-item-list">{items.map((item, index) => (
        <div key={item.id} data-item-index={index} className={`diy-item-row${draggedItemId === item.id ? " dragging" : ""}`}>
          <button
            type="button"
            className="drag-grip"
            aria-label={`Reorder ${item.label || "line item"}`}
            title="Drag to reorder, or use the arrow keys"
            onPointerDown={(event) => {
              setDraggedItemId(item.id);
              capturePointer(event.currentTarget, event.pointerId);
            }}
            onPointerMove={(event) => {
              if (draggedItemId !== item.id) return;
              const overIndex = rowIndexAt(event.clientX, event.clientY);
              const over = overIndex === null ? undefined : items[overIndex];
              if (over && over.id !== item.id) moveLineItem(item.id, over.id);
            }}
            onPointerUp={(event) => {
              releasePointer(event.currentTarget, event.pointerId);
              setDraggedItemId(null);
            }}
            onPointerCancel={() => setDraggedItemId(null)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              nudgeLineItem(item.id, event.key === "ArrowUp" ? -1 : 1);
            }}
          >⠿</button>
          <input aria-label="Line item" value={item.label} onChange={(event) => updateLineItem(item.id,"label",event.target.value)} />
          <input aria-label="Quantity" value={item.quantity} onChange={(event) => updateLineItem(item.id,"quantity",event.target.value)} />
          <button type="button" aria-label="Remove line item" onClick={() => removeLineItem(item.id)}>×</button>
        </div>
      ))}</div>
      {/* Last: a template is another way to start, and "Save this" belongs after the work. */}
      <TemplatePicker templates={templates} isFull={templatesFull} onApply={applyTemplate} onSave={saveTemplate} onDelete={deleteTemplate} />
    </section>
  );
}
