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

Neither file can reach the editor's interactions. PNG export, sticker dragging,
photo upload and the share modal still have to be checked in a browser.

The local development server normally runs at `http://localhost:3000`.

## Routes

- `/` — Main Papermint DIY Receipt Editor for consumers.
- `/studio` — Earlier business receipt studio. Preserve this route unless a task explicitly removes it.

## Important files

- `app/page.tsx` — Main editor state, interactions, receipt preview, sharing, and PNG export.
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

1. Split `app/page.tsx` into editor controls, receipt canvas, photo editor, share/export utilities, and state hooks.
2. Add undo/redo and local autosave using versioned `localStorage` data.
3. Improve mobile touch dragging, sticker gestures, and photo crop controls.
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

