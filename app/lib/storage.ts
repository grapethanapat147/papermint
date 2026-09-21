import type { ReceiptTemplate, SharedStory } from "../types";

const STORAGE_KEY = "papermint:draft";
const TEMPLATES_KEY = "papermint:templates";

/** Caps the saved list so templates can never crowd out the autosaved draft. */
export const MAX_SAVED_TEMPLATES = 12;

/**
 * Bump when the stored shape changes. A draft written by an older version is
 * dropped rather than migrated — a lost autosave is a small cost next to
 * rendering a half-understood draft onto someone's receipt.
 */
export const DRAFT_VERSION = 1;

type StoredDraft = {
  version: number;
  savedAt: number;
  story: SharedStory;
};

/**
 * Every call is guarded. localStorage throws on access in private windows and
 * when site data is blocked, and setItem throws once the quota is reached, so
 * autosave must never be able to take the editor down with it.
 */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Photos are deliberately excluded: they are large, and they stay on-device only. */
export function saveDraft(story: SharedStory): boolean {
  const store = storage();
  if (!store) return false;
  const payload: StoredDraft = { version: DRAFT_VERSION, savedAt: Date.now(), story };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Most likely QuotaExceededError. Drop the stale entry so the next save has room.
    try { store.removeItem(STORAGE_KEY); } catch { /* nothing more to do */ }
    return false;
  }
}

/** Returns null for: no draft, unreadable storage, bad JSON, or a different version. */
export function loadDraft(): SharedStory | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null = null;
  try { raw = store.getItem(STORAGE_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed?.version !== DRAFT_VERSION) return null;
    const story = parsed.story;
    if (!story || typeof story !== "object") return null;
    if (!Array.isArray(story.items) || typeof story.kind !== "string") return null;
    return story;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  const store = storage();
  if (!store) return;
  try { store.removeItem(STORAGE_KEY); } catch { /* nothing more to do */ }
}

type StoredTemplates = {
  version: number;
  templates: ReceiptTemplate[];
};

/** Returns [] for anything unreadable, so a bad entry never blocks the editor. */
export function loadTemplates(): ReceiptTemplate[] {
  const store = storage();
  if (!store) return [];
  let raw: string | null = null;
  try { raw = store.getItem(TEMPLATES_KEY); } catch { return []; }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredTemplates;
    if (parsed?.version !== DRAFT_VERSION) return [];
    if (!Array.isArray(parsed.templates)) return [];
    return parsed.templates.filter((template) =>
      template
      && typeof template.id === "string"
      && typeof template.name === "string"
      && Array.isArray(template.items)
      && !template.builtIn);
  } catch {
    return [];
  }
}

export function saveTemplates(templates: ReceiptTemplate[]): boolean {
  const store = storage();
  if (!store) return false;
  const payload: StoredTemplates = { version: DRAFT_VERSION, templates: templates.slice(0, MAX_SAVED_TEMPLATES) };
  try {
    store.setItem(TEMPLATES_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
