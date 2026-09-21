import { useState } from "react";

import type { ReceiptTemplate } from "../types";

type TemplatePickerProps = {
  templates: ReceiptTemplate[];
  /** True once the saved list is at its cap, so saving is refused up front. */
  isFull: boolean;
  onApply: (template: ReceiptTemplate) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
};

export function TemplatePicker({ templates, isFull, onApply, onSave, onDelete }: TemplatePickerProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    setNaming(false);
  }

  return (
    <div className="template-picker">
      <div className="diy-items-heading">
        <span>TEMPLATES</span>
        <button
          type="button"
          onClick={() => setNaming((open) => !open)}
          disabled={isFull}
          title={isFull ? "Saved templates are full — delete one first" : "Save this look and line-up"}
        >{naming ? "Cancel" : "＋ Save this"}</button>
      </div>

      {naming && (
        <div className="template-namer">
          <input
            aria-label="Template name"
            value={name}
            maxLength={28}
            placeholder="Name this template"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
          />
          <button type="button" onClick={commit} disabled={!name.trim()}>Save</button>
        </div>
      )}

      <ul className="template-list">
        {templates.map((template) => (
          <li key={template.id}>
            <button type="button" className="template-chip" onClick={() => onApply(template)}>
              <b>{template.name}</b>
              <small>{template.items.length} lines · {template.tone}</small>
            </button>
            {!template.builtIn && (
              <button
                type="button"
                className="template-delete"
                aria-label={`Delete template ${template.name}`}
                onClick={() => onDelete(template.id)}
              >×</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
