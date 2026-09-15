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
  `storage.ts` (versioned autosave), `random.ts`.
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
- Stickers can be added, selected, moved, rotated, resized, and removed.
- Users can take a photo with the rear camera or upload one, then apply crop position, zoom, rotation, filters, brightness, contrast, saturation, warmth, and fade.
- Shareable text/style/sticker state is encoded in the URL hash as `#s=...`.
- Uploaded photos are intentionally local-only data URLs. They are not uploaded or included in the shared URL.
- PNG export is rendered with Canvas 2D in `downloadStory`.
- The app currently has no required account, database, or cloud image storage for the consumer creation flow.

## Engineering constraints

- Do not add user photos to URLs, analytics, or remote storage without an explicit privacy and persistence design.
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
3. Mobile touch — partly done. Line-item reordering and sticker dragging are
   pointer-driven, so a finger works; the grip is a real button and arrow keys
   reorder too. Still open: photo crop controls, and pointer hit-testing uses
   `elementFromPoint`, so dragging a row to a position off-screen does nothing
   (no auto-scroll yet).
4. Add reusable receipt templates and user-created template saving.
5. Improve WYSIWYG export fidelity and add export sizes for Stories, Posts, and downloadable receipts.
6. Add optional accounts/cloud persistence only after defining privacy, moderation, and storage costs.
7. Build a remixable public gallery only with explicit consent and abuse-reporting controls.

## Definition of done

A change is ready when:

- The primary user flow works without sign-up.
- Desktop and mobile layouts remain usable.
- Share, remix, and PNG export still work where relevant.
- `/studio` still loads unless intentionally changed.
- `npm run build` succeeds.
- New behavior has focused tests when practical.

