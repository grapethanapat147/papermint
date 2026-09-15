import type { StoryItem } from "../types";

type ShareModalProps = {
  closeModal: () => void;
  activeKind: { icon: string; label: string };
  names: string;
  items: StoryItem[];
  nativeShare: () => void;
  copyStoryLink: () => void;
  copied: boolean;
  downloadStory: () => void;
  /** Drives the privacy note: a photo never travels in the link, only in the PNG. */
  photoData: string | null;
};

export function ShareModal({
  closeModal, activeKind, names, items, nativeShare, copyStoryLink, copied, downloadStory, photoData,
}: ShareModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}><section className="story-modal share-story-modal" role="dialog" aria-modal="true" aria-labelledby="share-story-title"><button className="modal-close" type="button" onClick={() => closeModal()}>×</button><span className="modal-icon">↗</span><span className="stories-kicker">PASS IT ON</span><h2 id="share-story-title">Who should add the next line?</h2><p>The link carries this receipt with it. Anyone you send it to can view, add, and remix.</p><div className="share-preview"><span className="share-mini-receipt">{activeKind.icon}</span><div><strong>{activeKind.label}</strong><small>{names} · {items.length} line items</small></div></div><div className="story-share-actions"><button type="button" onClick={nativeShare}>Share with a friend</button><button type="button" onClick={copyStoryLink}>{copied ? "Link copied!" : "Copy story link"}</button><button type="button" onClick={downloadStory}>Download Story PNG</button></div><small className="link-note">{photoData ? "Your photo stays private on this device and is included only in the downloaded PNG. The story link carries text and styling." : "Story data is encoded in the URL; there is no public feed or permanent database yet."}</small></section></div>
  );
}
