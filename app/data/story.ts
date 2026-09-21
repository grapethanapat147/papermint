import type { Accent, PhotoFilter, StoryKind, Tone } from "../types";

export const kinds: Array<{ id: StoryKind; label: string; icon: string; prompt: string }> = [
  { id: "friendship", label: "Our Friendship", icon: "♡", prompt: "Mook & Ploy" },
  { id: "month", label: "My Month", icon: "◷", prompt: "August was a beautiful mess" },
  { id: "trip", label: "Our Trip", icon: "⌁", prompt: "Chiang Mai with the best people" },
  { id: "work", label: "Work Survival", icon: "⌘", prompt: "Launch week, somehow survived" },
  { id: "era", label: "My Current Era", icon: "✦", prompt: "Learning to choose myself" },
];

export const storyLines: Record<StoryKind, Record<Tone, Array<[string, string]>>> = {
  friendship: {
    warm: [["Late-night calls", "× 47"], ["Times you showed up", "× ∞"], ["Tiny things you remembered", "× 28"], ["Years of choosing each other", "× MORE"]],
    funny: [["Plans we cancelled", "× 12"], ["Bad jokes that still worked", "× 999"], ["Screenshots without context", "× 84"], ["Meals we said we'd split", "× NEVER"]],
    honest: [["Hard truths said gently", "× 9"], ["Silences that felt safe", "× 31"], ["Arguments we came back from", "× 4"], ["Reasons I still call you", "× ALL"]],
  },
  month: {
    warm: [["Small wins I almost missed", "× 11"], ["Slow mornings", "× 7"], ["People who made it lighter", "× 5"], ["Proof I kept going", "× DAILY"]],
    funny: [["Tabs left open", "× 63"], ["I deserve a treat moments", "× 19"], ["Plans moved to next week", "× 8"], ["Main character minutes", "× 404"]],
    honest: [["Days I felt behind", "× 6"], ["Boundaries I finally kept", "× 3"], ["Things I outgrew", "× 4"], ["Courage nobody saw", "× ENOUGH"]],
  },
  trip: {
    warm: [["New roads taken", "× 14"], ["Golden-hour stops", "× 6"], ["Meals worth remembering", "× 9"], ["Stories brought home", "× FOREVER"]],
    funny: [["Wrong turns that became lore", "× 5"], ["Photos nobody can post", "× 38"], ["Where should we eat debates", "× 17"], ["Actual itinerary followed", "× 0"]],
    honest: [["Moments we felt free", "× 8"], ["Things the road taught us", "× 5"], ["Quiet views shared", "× 12"], ["Distance from the old us", "× FAR"]],
  },
  work: {
    warm: [["Tiny progress made", "× 23"], ["Teammates who had my back", "× 4"], ["Ideas worth protecting", "× 7"], ["Reasons to keep building", "× MANY"]],
    funny: [["Meetings that could be texts", "× 11"], ["Coffee-based decisions", "× 27"], ["Final_v8_REAL files", "× 16"], ["Times we said quick sync", "× TOO MANY"]],
    honest: [["Things I carried quietly", "× 6"], ["No's I needed to say", "× 3"], ["Work I'm genuinely proud of", "× 5"], ["Energy left in the tank", "× 2%"]],
  },
  era: {
    warm: [["Soft choices made", "× 8"], ["Things that feel like home", "× 12"], ["Versions of me welcomed", "× 4"], ["Hope currently in stock", "× PLENTY"]],
    funny: [["Personality rebrands", "× 3"], ["New hobbies hyperfixated", "× 7"], ["Signs from the universe", "× 22"], ["Explanations I owe", "× 0"]],
    honest: [["Old patterns noticed", "× 9"], ["People-pleasing returned", "× 2"], ["Times I chose myself", "× 6"], ["Becoming who I needed", "× NOW"]],
  },
};

export const totals: Record<Tone, string[]> = {
  warm: ["Still adding up.", "Worth every moment.", "More than I can count."],
  funny: ["Emotionally over budget.", "No refunds, obviously.", "Somehow still iconic."],
  honest: ["It mattered anyway.", "Not perfect. Still mine.", "Paid in becoming."],
};

export const accentHex: Record<Accent, string> = { coral: "#c05940", sage: "#477c69", ink: "#292b27", mustard: "#c08a2c", lavender: "#7663a5", blue: "#3e6f91" };
export const stickerAssets = [
  { symbol: "♡", label: "Heart" }, { symbol: "✦", label: "Spark" }, { symbol: "✿", label: "Flower" }, { symbol: "☻", label: "Smile" },
  { symbol: "OURS", label: "Ours" }, { symbol: "+ YOU", label: "You" }, { symbol: "GOOD DAY", label: "Good day" }, { symbol: "PAID", label: "Paid" },
];
export const photoFilters: Array<{ id: PhotoFilter; label: string; css: string }> = [
  { id: "original", label: "Original", css: "" },
  { id: "warm", label: "Warm", css: "sepia(.18) saturate(1.14) hue-rotate(-8deg)" },
  { id: "film", label: "Film", css: "sepia(.22) contrast(1.08) saturate(.86)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "dream", label: "Dream", css: "brightness(1.06) saturate(1.22) contrast(.94)" },
];

/**
 * Fixed copy printed on every receipt. Kept here so the on-screen receipt and
 * the PNG export cannot drift apart — they previously did: the note the user
 * writes was shown on screen and silently dropped from the export.
 */
export const receiptChrome = {
  brand: "PAPERMINT STORIES",
  issuedLabel: "ISSUED WITH FEELINGS",
  issuedOn: "24 AUG 2026",
  photoCaption: "THE MOMENT, AS IT FELT",
  totalLabel: "TOTAL",
  stamp: ["STILL", "ADDING", "UP"],
  disclaimer: "NOT A FINANCIAL DOCUMENT · JUST PROOF IT MATTERED",
  fallbackNote: "Not perfect. Still ours.",
  fallbackNames: "Your story",
} as const;
