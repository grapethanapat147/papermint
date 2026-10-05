/**
 * True when the whole element can be seen: inside the window and inside every
 * ancestor that clips it. The desktop controls column scrolls on its own, so an
 * element can be within the window yet hidden in that column.
 */
export function isFullyVisible(element: Element): boolean {
  const box = element.getBoundingClientRect();
  if (box.top < 0 || box.bottom > window.innerHeight) return false;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflowY === "visible") continue;
    const clip = parent.getBoundingClientRect();
    if (box.top < clip.top || box.bottom > clip.bottom) return false;
  }
  return true;
}

/** Scrolls the element into view only if it is not already, honouring reduced motion. */
export function reveal(element: Element, block: ScrollLogicalPosition): void {
  if (isFullyVisible(element)) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView?.({ behavior: reduceMotion ? "instant" : "smooth", block });
}
