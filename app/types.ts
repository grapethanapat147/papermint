export type StoryKind = "friendship" | "month" | "trip" | "work" | "era";
export type Tone = "warm" | "funny" | "honest";
export type Decoration = "classic" | "botanical" | "mono" | "playful";
export type Accent = "coral" | "sage" | "ink" | "mustard" | "lavender" | "blue";
export type PhotoFilter = "original" | "warm" | "film" | "mono" | "dream";
export type ToolTab = "content" | "style" | "photo" | "stickers";
export type FontStyle = "editorial" | "rounded" | "mono";
export type PaperTone = "cream" | "white" | "blush" | "sage";
export type EdgeStyle = "torn" | "straight" | "rounded";
export type StoryItem = { id: string; label: string; quantity: string };
export type DiySticker = { id: string; symbol: string; label: string; x: number; y: number; size: number; rotation: number };
export type SharedStory = { kind: StoryKind; names: string; note: string; tone: Tone; decoration?: Decoration; accent?: Accent; fontStyle?: FontStyle; paperTone?: PaperTone; edgeStyle?: EdgeStyle; textScale?: number; stickers?: DiySticker[]; items: StoryItem[]; total: string; edition: number };

/**
 * A reusable starting point: how the receipt looks, plus a skeleton of what it
 * says. Deliberately excludes `names`, stickers, the photo and the edition —
 * a template seeds a new receipt, it is not a copy of an old one.
 */
export type TemplateItem = { label: string; quantity: string };

export type ReceiptTemplate = {
  id: string;
  name: string;
  kind: StoryKind;
  tone: Tone;
  decoration: Decoration;
  accent: Accent;
  fontStyle: FontStyle;
  paperTone: PaperTone;
  edgeStyle: EdgeStyle;
  textScale: number;
  note: string;
  total: string;
  items: TemplateItem[];
  /** True for the ones shipped with the app, which cannot be deleted. */
  builtIn?: boolean;
};
