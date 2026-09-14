import type { SharedStory } from "../types";

export function encodeStory(story: SharedStory) {
  const bytes = new TextEncoder().encode(JSON.stringify(story));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeStory(value: string): SharedStory | null {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharedStory;
  } catch {
    return null;
  }
}
