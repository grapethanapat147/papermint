# Papermint — Claude Code Project Guide

Papermint is a mobile-friendly DIY web app for turning memories, friendships, trips, work stories, and photos into shareable receipt-style artwork.

Production site: https://papermint-receipt-studio.grapetnp147.chatgpt.site/

## Product direction

- Make creation feel direct and playful: click, drag, drop, edit, preview, and export in one screen.
- Prioritize the consumer DIY editor at `/`.
- Keep the experience usable on mobile, including camera/photo upload, touch targets, and responsive layout.
- Preserve the warm paper-and-ink visual identity while keeping controls clear and accessible.
- Treat sharing and remixing as the primary viral loop.

## Stack

- React 19 + TypeScript
- vinext on Vite
- Cloudflare Workers / Sites hosting
- Plain CSS in `app/globals.css`
- Canvas 2D for PNG export

Node.js 22.13.0 or newer is required.

## Setup and verification

```bash
npm install
npm run dev
```

Before handing off a change, run:

```bash
npm run build
npm test
npm run lint
```

`npm test` builds, then runs every `tests/*.test.mjs` file on Node's built-in
test runner — no test framework is installed, and Node strips the TypeScript in
`app/` on import, so specs can import `app/**/*.ts` directly.

- `tests/rendered-html.test.mjs` — server-rendered HTML for `/` and `/studio`.
- `tests/story-modules.test.mjs` — share payload round-trip, sticker tilt and id
  shape, and the data invariants (every kind has copy for every tone, accents all
  have a hex colour, filter ids unique).

`npm run test:unit` runs the vitest specs (`tests/**/*.test.tsx`) in jsdom via
`vitest.config.ts` — kept separate from `vite.config.ts`, whose Cloudflare and RSC
plugins do not work under jsdom.

- `tests/editor.test.tsx` — characterisation tests for the editor: tab switching,
  kind selection, line-item add/edit/remove, sticker add and selection, and
  hydrating a shared draft from the `#s=` hash.

jsdom has no canvas, so PNG export stays a browser check, as do sticker dragging,
photo upload and the share modal.

The local development server normally runs at `http://localhost:3000`.

## Routes

- `/` — Main Papermint DIY Receipt Editor for consumers.
- `/studio` — Earlier business receipt studio. Preserve this route unless a task explicitly removes it.

## Important files

- `app/page.tsx` — Composes the editor: page-level state (active tool, modals) and layout.
- `app/hooks/` — `useStoryDraft` (what the receipt says and how it looks), `useStickers`,
  `usePhotoEditor`. Each owns its slice of state and exposes a stable `hydrate*` for the
  `#s=` share payload.
- `app/components/` — `ContentPanel`, `StylePanel`, `PhotoPanel`, `StickerPanel`,
  `ReceiptCanvas`, `AddLineModal`, `ShareModal`.
- `app/lib/` — `share.ts` (`#s=` encode/decode), `export.ts` (Canvas 2D PNG),
  `storage.ts` (versioned autosave and saved templates), `random.ts`.
- `app/data/templates.ts` — the shipped templates.
- `app/data/story.ts` — copy and palettes. `app/types.ts` — shared types.
- `app/globals.css` — Global styles for both the DIY editor and the legacy studio.
- `app/layout.tsx` — App metadata and shared document layout.
- `app/studio/StudioClient.tsx` — Business receipt studio UI.
- `app/studio/page.tsx` — `/studio` route entry.
- `.openai/hosting.json` — Existing Sites deployment identity. Do not change `project_id`.
- `worker/index.ts` — Cloudflare worker entry.

## Current behavior

- The main editor is a client component and keeps the active draft in React state.
- Receipt lines can be reordered with drag and drop.
- Stickers can be added, selected, moved, rotated, resized, and removed. On
  touch, two fingers pinch to resize and twist to rotate; lifting one finger
  hands control back to dragging rather than ending the gesture.
- Users can take a photo with the rear camera or upload one, then apply crop
  position (drag the photo on the receipt, or the Crop sliders), zoom, a filter
  preset, brightness, contrast and saturation. Rotation, warmth and fade are NOT
  implemented — earlier versions of this file claimed they were.
- Shareable text/style/sticker state is encoded in the URL hash as `#s=...`.
- A device handoff (`?h=<id>`) carries the draft AND its photo through R2 for 24
  hours, with no account — the unguessable link is the only credential. The photo
  is downscaled on the device before upload. Precedence on load: `?h=` beats
  `#s=`, which beats the saved draft.
- Uploaded photos are intentionally local-only data URLs. They are not uploaded or included in the shared URL.
- PNG export is rendered with Canvas 2D in `downloadStory`, which takes an
  export preset (story / post / receipt). Anything added to the receipt must be
  drawn there too, and its fixed copy belongs in `receiptChrome`.
- The app currently has no required account, database, or cloud image storage for the consumer creation flow.

## Engineering constraints

- Do not add user photos to URLs, analytics, or remote storage without an explicit
  privacy and persistence design. The one sanctioned exception is the `?h=` device
  handoff: downscaled, 24-hour retention, no account. Anything longer or broader
  needs that design written down first.
- `.openai/hosting.json` now declares `"r2": "HANDOFF"`. The app degrades to a 503
  and hides nothing else when the binding is absent, so a deployment without the
  bucket still works — but the handoff will not.
- Never commit secrets or `.env` files.
- Keep `.openai/hosting.json` and its `project_id` intact so the existing public site can be updated.
- Keep changes responsive from small phones through desktop screens.
- Preserve keyboard accessibility, visible focus states, and `prefers-reduced-motion` behavior.
- Avoid regressions on `/studio`; `app/globals.css` contains styles for both routes.
- Prefer extracting focused components/hooks before making `app/page.tsx` substantially larger.
- Keep export output aligned with the visible preview. Any new editable element should also be represented in PNG export and shared-state serialization when appropriate.

## Recommended next improvements

1. ~~Split `app/page.tsx`~~ — done. It is now composition only; state lives in
   `app/hooks/`, markup in `app/components/`.
2. ~~Add undo/redo and local autosave~~ — done. `app/lib/storage.ts` holds a
   versioned draft (`papermint:draft`, v1); `app/hooks/useDraftHistory.ts` gives
   undo/redo over the `SharedStory` snapshot. Two rules worth keeping: the photo is
   never written to storage, and autosave pauses while a shared story is on screen
   so a visitor's link cannot overwrite the draft on this device.
3. ~~Improve mobile touch dragging, sticker gestures, and photo crop controls~~ —
   done. Reordering and sticker dragging are pointer-driven, so a finger works;
   the grip is a real button and arrow keys reorder too. Stickers take two-finger
   pinch to resize and twist to rotate, clamped to the same range as the sliders.
   Photo crop position is draggable with sliders for keyboard use, and preview and
   PNG export crop to the same place. One limit remains: hit-testing uses
   `elementFromPoint`, so dragging a row to an off-screen position does nothing
   (no auto-scroll).
4. ~~Add reusable receipt templates and user-created template saving~~ — done.
   `app/data/templates.ts` ships one per story kind; `app/hooks/useTemplates.ts`
   holds up to 12 saved per device under `papermint:templates`. A template is the
   look plus a content skeleton — it deliberately carries neither the subject
   (`names`), nor stickers, nor the photo, so applying one never pastes someone
   else's personal details onto a new receipt.
5. ~~Improve WYSIWYG export fidelity and add export sizes~~ — done. Three
   presets in `app/lib/export.ts`: Story 1080x1920, Post 1080x1350, and Receipt
   only 840x1780 with no backdrop. The receipt is drawn once at its own size and
   the whole thing is scaled to fit, so no preset re-flows or loses content;
   Story still lands at scale 1, unchanged from before. Fidelity gaps closed: the
   user's note (it was missing from the PNG entirely), the issued-on row, the
   photo caption and the barcode. Fixed receipt copy now lives in
   `receiptChrome` in `app/data/story.ts` so the screen and the canvas cannot
   drift apart again.
6. Partly done — the privacy/moderation/cost work is written up in the decision
   doc, and the outcome was a device handoff rather than accounts: `?h=` links,
   photo included, 24-hour retention, no sign-in. Accounts and long-term cloud
   persistence remain undone and still need that design.
   **Outstanding for the handoff:** an R2 lifecycle rule on the bucket, so expired
   bytes go even if nobody opens the link again — expiry is currently enforced on
   read only. And a QR code beside the link, which needs a dependency.
7. Build a remixable public gallery only with explicit consent and abuse-reporting controls.

## Definition of done

A change is ready when:

- The primary user flow works without sign-up.
- Desktop and mobile layouts remain usable.
- Share, remix, and PNG export still work where relevant.
- `/studio` still loads unless intentionally changed.
- `npm run build` succeeds.
- New behavior has focused tests when practical.

