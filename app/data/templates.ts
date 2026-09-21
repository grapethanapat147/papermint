import type { ReceiptTemplate } from "../types";

/**
 * Shipped starting points, one per story kind. They exist so a first-time
 * visitor never faces an empty receipt — pick one, change the subject, done.
 */
export const builtInTemplates: ReceiptTemplate[] = [
  {
    id: "builtin-friendship", name: "Old friends", builtIn: true,
    kind: "friendship", tone: "warm", decoration: "classic", accent: "coral",
    fontStyle: "editorial", paperTone: "cream", edgeStyle: "torn", textScale: 1.08,
    note: "We survived growing up without growing apart.",
    total: "Still adding up.",
    items: [
      { label: "Late-night calls", quantity: "× 47" },
      { label: "Times you showed up", quantity: "× ∞" },
      { label: "Inside jokes still running", quantity: "× 12" },
      { label: "Years of choosing each other", quantity: "× MORE" },
    ],
  },
  {
    id: "builtin-trip", name: "Road trip", builtIn: true,
    kind: "trip", tone: "funny", decoration: "botanical", accent: "sage",
    fontStyle: "rounded", paperTone: "sage", edgeStyle: "rounded", textScale: 1.1,
    note: "The detours were the trip.",
    total: "Emotionally over budget.",
    items: [
      { label: "Wrong turns that became lore", quantity: "× 5" },
      { label: "Snacks classified as a meal", quantity: "× 9" },
      { label: "Where should we eat debates", quantity: "× 17" },
      { label: "Actual itinerary followed", quantity: "× 0" },
    ],
  },
  {
    id: "builtin-month", name: "Month in review", builtIn: true,
    kind: "month", tone: "honest", decoration: "mono", accent: "ink",
    fontStyle: "mono", paperTone: "white", edgeStyle: "straight", textScale: 1,
    note: "Quietly harder than it looked.",
    total: "It mattered anyway.",
    items: [
      { label: "Days I felt behind", quantity: "× 6" },
      { label: "Boundaries I finally kept", quantity: "× 3" },
      { label: "Small wins I almost missed", quantity: "× 11" },
      { label: "Courage nobody saw", quantity: "× ENOUGH" },
    ],
  },
  {
    id: "builtin-work", name: "Launch week", builtIn: true,
    kind: "work", tone: "funny", decoration: "playful", accent: "mustard",
    fontStyle: "mono", paperTone: "cream", edgeStyle: "torn", textScale: 1.02,
    note: "Shipped it. Barely.",
    total: "Somehow still iconic.",
    items: [
      { label: "Meetings that could be texts", quantity: "× 11" },
      { label: "Coffee-based decisions", quantity: "× 27" },
      { label: "Final_v8_REAL files", quantity: "× 16" },
      { label: "Energy left in the tank", quantity: "× 2%" },
    ],
  },
  {
    id: "builtin-era", name: "Current era", builtIn: true,
    kind: "era", tone: "warm", decoration: "classic", accent: "lavender",
    fontStyle: "editorial", paperTone: "blush", edgeStyle: "torn", textScale: 1.12,
    note: "Becoming someone I would have liked.",
    total: "Paid in becoming.",
    items: [
      { label: "Soft choices made", quantity: "× 8" },
      { label: "Versions of me welcomed", quantity: "× 4" },
      { label: "Times I chose myself", quantity: "× 6" },
      { label: "Hope currently in stock", quantity: "× PLENTY" },
    ],
  },
];
