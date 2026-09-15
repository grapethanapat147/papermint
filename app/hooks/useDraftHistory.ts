import { useCallback, useEffect, useRef, useState } from "react";

import type { SharedStory } from "../types";

/** Typing inside this window collapses into a single undo step. */
const COALESCE_MS = 400;
const LIMIT = 50;

/**
 * Undo/redo over the serialisable draft — the same SharedStory shape used for
 * the `#s=` link and for autosave.
 *
 * The uploaded photo is NOT part of that shape, so photo edits are outside
 * history: undo will not bring a removed photo back or revert a filter.
 *
 * @param story      the current draft
 * @param applyStory puts a snapshot back; must not mark the draft as shared
 */
export function useDraftHistory(story: SharedStory, applyStory: (story: SharedStory) => void) {
  const key = JSON.stringify(story);
  // Mirrored into a ref after commit — never written during render, which is
  // unsafe once a render can be thrown away.
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);

  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const committedKey = useRef(key);
  const skipNextCommit = useRef(false);
  /** Set by resetHistory: the next change is a hydration, not an edit. */
  const rebaseline = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (skipNextCommit.current) { skipNextCommit.current = false; committedKey.current = key; return; }
    if (rebaseline.current) { rebaseline.current = false; committedKey.current = key; return; }
    if (key === committedKey.current) return;
    const timer = window.setTimeout(() => {
      past.current = [...past.current, committedKey.current].slice(-LIMIT);
      future.current = [];
      committedKey.current = key;
      setCanUndo(true);
      setCanRedo(false);
    }, COALESCE_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  /**
   * Commits an edit that is still inside the coalescing window. Without this,
   * undo pressed straight after typing would skip past the typing and revert
   * the edit before it.
   */
  const flushPending = useCallback(() => {
    if (currentKey.current === committedKey.current) return;
    past.current = [...past.current, committedKey.current].slice(-LIMIT);
    committedKey.current = currentKey.current;
  }, []);

  const travel = useCallback((from: "past" | "future") => {
    const stack = from === "past" ? past : future;
    const other = from === "past" ? future : past;
    const target = stack.current[stack.current.length - 1];
    if (target === undefined) return;
    stack.current = stack.current.slice(0, -1);
    other.current = [...other.current, committedKey.current];
    skipNextCommit.current = true;
    committedKey.current = target;
    applyStory(JSON.parse(target) as SharedStory);
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, [applyStory]);

  const undo = useCallback(() => { flushPending(); travel("past"); }, [flushPending, travel]);
  const redo = useCallback(() => travel("future"), [travel]);

  /**
   * Drops history for a hydration that is about to land. Call it only when a
   * snapshot really is being applied — the state change it causes is absorbed as
   * the new baseline instead of becoming an undoable step.
   */
  const resetHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    rebaseline.current = true;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { undo, redo, canUndo, canRedo, resetHistory };
}
