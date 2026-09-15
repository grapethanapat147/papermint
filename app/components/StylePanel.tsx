import type { Accent, Decoration, EdgeStyle, FontStyle, PaperTone, Tone } from "../types";

type StylePanelProps = {
  decoration: Decoration;
  setDecoration: (value: Decoration) => void;
  paperTone: PaperTone;
  setPaperTone: (value: PaperTone) => void;
  fontStyle: FontStyle;
  setFontStyle: (value: FontStyle) => void;
  edgeStyle: EdgeStyle;
  setEdgeStyle: (value: EdgeStyle) => void;
  accent: Accent;
  setAccent: (value: Accent) => void;
  tone: Tone;
  /** Picking a mood re-rolls the line items, so this is not purely cosmetic. */
  generateStory: (tone: Tone) => void;
  textScale: number;
  setTextScale: (value: number) => void;
};

export function StylePanel({
  decoration, setDecoration, paperTone, setPaperTone, fontStyle, setFontStyle,
  edgeStyle, setEdgeStyle, accent, setAccent, tone, generateStory, textScale, setTextScale,
}: StylePanelProps) {
  return (
    <section className="diy-panel" aria-label="Receipt style">
      <div className="diy-panel-heading"><div><strong>Make it look yours</strong><small>Every option updates the canvas live.</small></div></div>
      <div className="diy-option"><span>TEMPLATE</span><div className="diy-choice-grid four">{(["classic","botanical","mono","playful"] as Decoration[]).map((entry) => <button type="button" key={entry} className={decoration === entry ? "active" : ""} onClick={() => setDecoration(entry)}><i>{entry === "classic" ? "P" : entry === "botanical" ? "❦" : entry === "mono" ? "M" : "☺"}</i><b>{entry}</b></button>)}</div></div>
      <div className="diy-option"><span>PAPER</span><div className="diy-choice-grid four paper-choices">{(["cream","white","blush","sage"] as PaperTone[]).map((entry) => <button type="button" key={entry} className={`${entry} ${paperTone === entry ? "active" : ""}`} onClick={() => setPaperTone(entry)}><i /><b>{entry}</b></button>)}</div></div>
      <div className="diy-option"><span>FONT</span><div className="diy-segments">{(["editorial","rounded","mono"] as FontStyle[]).map((entry) => <button type="button" key={entry} className={fontStyle === entry ? "active" : ""} onClick={() => setFontStyle(entry)}>{entry}</button>)}</div></div>
      <div className="diy-option"><span>EDGE</span><div className="diy-segments">{(["torn","straight","rounded"] as EdgeStyle[]).map((entry) => <button type="button" key={entry} className={edgeStyle === entry ? "active" : ""} onClick={() => setEdgeStyle(entry)}>{entry}</button>)}</div></div>
      <div className="diy-option"><span>ACCENT COLOR</span><div className="designer-colors diy-colors">{(["coral","sage","ink","mustard","lavender","blue"] as Accent[]).map((entry) => <button type="button" key={entry} className={`${entry} ${accent === entry ? "active" : ""}`} aria-label={`${entry} accent`} onClick={() => setAccent(entry)} />)}</div></div>
      <div className="diy-option"><span>STORY MOOD</span><div className="diy-segments mood-segments">{(["warm","funny","honest"] as Tone[]).map((entry) => <button type="button" key={entry} className={tone === entry ? "active" : ""} onClick={() => generateStory(entry)}>{entry}</button>)}</div></div>
      <label className="diy-range"><span>TEXT SIZE <b>{Math.round(textScale * 100)}%</b></span><input type="range" min="0.9" max="1.35" step="0.05" value={textScale} onChange={(event) => setTextScale(Number(event.target.value))} /></label>
    </section>
  );
}
