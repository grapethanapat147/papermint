import type { SharedStory } from "../types";
import type { HandoffPayload } from "./handoff-shared";

/**
 * Longest side of an uploaded photo. The receipt draws the photo into a
 * 720x330 frame, so 1440 is 2x what any export needs and keeps a typical
 * phone photo around a tenth of its original bytes.
 */
const MAX_PHOTO_EDGE = 1440;
const PHOTO_QUALITY = 0.8;
/**
 * A decode that neither loads nor errors would leave the handoff button stuck
 * on "Preparing…" forever, so give up and send what we have.
 */
const DECODE_TIMEOUT_MS = 4000;

/**
 * Shrinks a photo before it leaves the device. Returns the original data URL
 * untouched if it is already small enough or cannot be decoded — a handoff that
 * carries a slightly large photo beats one that fails.
 */
export async function downscalePhoto(dataUrl: string): Promise<string> {
  try {
    const image = new Image();
    image.src = dataUrl;
    const decoded = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), DECODE_TIMEOUT_MS);
      image.onload = () => { clearTimeout(timer); resolve(true); };
      image.onerror = () => { clearTimeout(timer); resolve(false); };
    });
    if (!decoded) return dataUrl;

    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest) return dataUrl;
    const scale = Math.min(1, MAX_PHOTO_EDGE / longest);
    if (scale === 1 && dataUrl.length < 400_000) return dataUrl;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  } catch {
    return dataUrl;
  }
}

export type HandoffCreated = { id: string; expiresAt: number };

/** Uploads a draft for another device. Throws with a readable message. */
export async function createHandoff(story: SharedStory, photo: string | null): Promise<HandoffCreated> {
  const payload: HandoffPayload = {
    story,
    photo: photo ? await downscalePhoto(photo) : null,
  };
  const response = await fetch("/api/handoff", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(detail.error ?? "The handoff could not be created.");
  }
  return (await response.json()) as HandoffCreated;
}

export type HandoffFetched = { story: SharedStory; photo: string | null; expiresAt: number };

export async function fetchHandoff(id: string): Promise<HandoffFetched | null> {
  const response = await fetch(`/api/handoff/${encodeURIComponent(id)}`);
  if (!response.ok) return null;
  return (await response.json()) as HandoffFetched;
}

/** The link the other device opens. `?h=` rather than `#h=`, so the id reaches the server. */
export const handoffUrl = (id: string) =>
  `${window.location.origin}${window.location.pathname}?h=${id}`;
