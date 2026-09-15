import { useCallback, useMemo, useState } from "react";

import { kinds, storyLines, totals } from "../data/story";
import { makeId } from "../lib/random";
import type {
  Accent, Decoration, EdgeStyle, FontStyle, PaperTone, SharedStory, StoryItem, StoryKind, Tone,
} from "../types";

const GENERATE_DELAY_MS = 650;

const seedItems = (kind: StoryKind, tone: Tone): StoryItem[] =>
  storyLines[kind][tone].map(([label, quantity]) => ({ id: makeId(), label, quantity }));

/**
 * Owns the receipt draft itself: what the story is about, how it reads, how it
 * looks, and the line items. Stickers and the photo live in their own hooks;
 * page.tsx composes all three into the shared payload.
 */
export function useStoryDraft() {
  const [kind, setKind] = useState<StoryKind>("friendship");
  const [names, setNames] = useState("Mook & Ploy");
  const [note, setNote] = useState("We survived growing up without growing apart.");
  const [tone, setTone] = useState<Tone>("warm");
  const [decoration, setDecoration] = useState<Decoration>("classic");
  const [accent, setAccent] = useState<Accent>("coral");
  const [fontStyle, setFontStyle] = useState<FontStyle>("editorial");
  const [paperTone, setPaperTone] = useState<PaperTone>("cream");
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("torn");
  const [textScale, setTextScale] = useState(1.08);
  const [items, setItems] = useState<StoryItem[]>(() => seedItems("friendship", "warm"));
  const [total, setTotal] = useState("Still adding up.");
  const [edition, setEdition] = useState(824);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadedFromShare, setLoadedFromShare] = useState(false);

  const activeKind = useMemo(() => kinds.find((entry) => entry.id === kind) ?? kinds[0], [kind]);

  /** Applies a decoded `#s=` payload. Stable, so a mount effect can depend on it. */
  const hydrateDraft = useCallback((shared: SharedStory) => {
    setKind(shared.kind); setNames(shared.names); setNote(shared.note); setTone(shared.tone);
    setDecoration(shared.decoration ?? "classic"); setAccent(shared.accent ?? "coral");
    setFontStyle(shared.fontStyle ?? "editorial"); setPaperTone(shared.paperTone ?? "cream");
    setEdgeStyle(shared.edgeStyle ?? "torn"); setTextScale(shared.textScale ?? 1.08);
    setItems(shared.items); setTotal(shared.total); setEdition(shared.edition);
    setLoadedFromShare(true);
  }, []);

  function chooseKind(next: StoryKind) {
    const selected = kinds.find((entry) => entry.id === next);
    setKind(next);
    if (selected) setNames(selected.prompt);
  }

  /**
   * Re-rolls the line items and total for a tone. Also drops the `#s=` hash,
   * because once the draft has been regenerated the link no longer describes it.
   */
  function generateStory(nextTone = tone) {
    setIsGenerating(true);
    window.setTimeout(() => {
      setItems(seedItems(kind, nextTone));
      const choices = totals[nextTone];
      setTotal(choices[(edition + kind.length + nextTone.length) % choices.length]);
      setEdition((current) => current + 1);
      setTone(nextTone);
      setLoadedFromShare(false);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setIsGenerating(false);
    }, GENERATE_DELAY_MS);
  }

  function appendLineItem(label: string) {
    setItems((current) => [...current, { id: makeId(), label, quantity: "× +1" }]);
  }

  function updateLineItem(id: string, key: "label" | "quantity", value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  /** Keeps at least one line on the receipt. */
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

  return {
    kind, names, note, tone, decoration, accent, fontStyle, paperTone, edgeStyle, textScale,
    items, total, edition, draggedItemId, isGenerating, loadedFromShare, activeKind,
    setNames, setNote, setDecoration, setAccent, setFontStyle, setPaperTone, setEdgeStyle,
    setTextScale, setDraggedItemId,
    hydrateDraft, chooseKind, generateStory, appendLineItem, updateLineItem, removeLineItem, reorderLineItem,
  };
}
