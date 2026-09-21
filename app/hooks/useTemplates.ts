import { useCallback, useEffect, useState } from "react";

import { builtInTemplates } from "../data/templates";
import { makeId } from "../lib/random";
import { loadTemplates, MAX_SAVED_TEMPLATES, saveTemplates } from "../lib/storage";
import type { ReceiptTemplate } from "../types";

/**
 * The template list: the shipped ones, plus whatever this device has saved.
 *
 * Saved templates load after mount for the same reason the draft does — the
 * server cannot see localStorage, so reading it during render would desync
 * hydration.
 */
export function useTemplates() {
  const [saved, setSaved] = useState<ReceiptTemplate[]>([]);

  // localStorage does not exist during SSR, so seeding this in the initializer
  // would desync hydration. Reading it once after mount is the only option.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { setSaved(loadTemplates()); }, []);

  /** Newest first, capped. Returns the stored template, or null when full. */
  const saveTemplate = useCallback((template: Omit<ReceiptTemplate, "id">): ReceiptTemplate | null => {
    if (saved.length >= MAX_SAVED_TEMPLATES) return null;
    const stored: ReceiptTemplate = { ...template, id: makeId() };
    const next = [stored, ...saved];
    setSaved(next);
    saveTemplates(next);
    return stored;
  }, [saved]);

  const deleteTemplate = useCallback((id: string) => {
    const next = saved.filter((template) => template.id !== id);
    setSaved(next);
    saveTemplates(next);
  }, [saved]);

  return {
    builtInTemplates,
    savedTemplates: saved,
    templates: [...builtInTemplates, ...saved],
    isFull: saved.length >= MAX_SAVED_TEMPLATES,
    saveTemplate,
    deleteTemplate,
  };
}
