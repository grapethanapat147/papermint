/**
 * Impure helpers kept at module scope. Calling Math.random() inside the component
 * body trips react-hooks/purity, so these stay outside it on purpose.
 */

export function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function randomStickerTilt() {
  return Math.round(Math.random() * 12) - 6;
}
