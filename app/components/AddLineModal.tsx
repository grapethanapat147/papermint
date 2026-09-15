import type { RefObject } from "react";

type AddLineModalProps = {
  closeModal: () => void;
  /** Focused when the modal opens, so the caller owns the ref. */
  addInputRef: RefObject<HTMLInputElement | null>;
  newLine: string;
  setNewLine: (value: string) => void;
  addLineItem: () => void;
};

export function AddLineModal({
  closeModal, addInputRef, newLine, setNewLine, addLineItem,
}: AddLineModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}><section className="story-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="modal-close" type="button" onClick={() => closeModal()}>×</button><span className="modal-icon">＋</span><span className="stories-kicker">YOUR TURN</span><h2 id="add-title">Add one thing only you would know.</h2><p>The best line items are strangely specific.</p><input ref={addInputRef} value={newLine} onChange={(event) => setNewLine(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLineItem(); }} placeholder="The voice note you sent at 2:14 AM" /><button className="modal-primary" type="button" onClick={addLineItem}>Add to our receipt →</button></section></div>
  );
}
