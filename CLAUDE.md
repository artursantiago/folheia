# Folheia

Open source (MIT) PDF/CBZ flipbook reader. 100% static site on GitHub Pages; everything runs in the browser. Solo, experimental project by Artur Santiago.

- Product plan and every scope decision: `docs/plano-mvp.md` (source of truth; update it when a decision changes).
- Roadmap (order of the backlog: work streams, waves, blocking decisions): `docs/roteiro.md`.
- Clean-room study of the references: `docs/estudo-referencias.md`.
- Mihon study (reader, screens, sources/extensions, performance): `docs/estudo-mihon.md`.
- Visual identity: `docs/identidade-visual.md`.
- **Approved screen prototype** (Ex-libris, 15 screens, light/dark): https://claude.ai/artifact/1YDBDe53B3ef4MnUi4Vigr (private; opens for Artur). A copy of the source lives in `docs/prototipo/` (`folheia.css` + one `.dc.html` per screen). It's the visual reference for every screen; read it before building or changing UI. It's a mockup, not production code: rebuild it with our tokens and components; don't copy its markup.

## Working agreement

- For now Artur prefers autonomy over heavy process. Before a significant chunk of work, show briefly **what you're about to do**; he'll speak up if something looks off. Then do it. Writing a spec (in `docs/`) is your call: do it when it helps you think through a piece or document how it works, not as a gate.
- Talk to Artur in Portuguese (pt-BR). Code, identifiers, comments and commit messages in **English**.
- Docs in `docs/` and `README.md` are in Portuguese; `README.en.md` is a short English summary.
- You may commit and push to `main` without asking. Stop to ask only for genuinely important decisions; otherwise keep going and summarize at the end.
- Artur often runs several sessions in parallel. Start derived sessions in their own **git worktree** so they don't disturb the main checkout or each other, and avoid repo-wide changes (renames, transfers, URL moves) while other sessions are active. When a worktree's work has landed, **always suggest cleaning it up** (remove the worktree and its merged branch): leftover worktrees once filled his disk.
- Small, descriptive commits, Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `perf:`, `ci:`), straight to `main`. Run lint, typecheck, tests and build before committing.
- **Public examples vs. personal files.** The example collection on the site is public, so it only lists public-domain works. Artur's own books (comics included) are used locally only: put them in `fixtures/personal/` (git-ignored) for testing, and never commit them or link them from the site. `fixtures/personal/invincible-vol-1.pdf` is a real 100 MB comic PDF, good for iPad performance tests.
- Anything not in the plan goes to the backlog (`docs/plano-mvp.md` §8) instead of being built on the side.

## Non-negotiable rules

1. **Learn from others, never copy.** Folheia is Artur's personal project (only he uses it), but the repo is public and MIT, so nothing from others' code goes in.
   - **Open-source readers** (e.g. Internet Archive BookReader, AGPL) may be read to understand how they work. Write the lessons in our own words in `docs/estudo-referencias.md`, never paste or adapt their code, CSS, names or assets, and prefer a separate study agent so the implementer works from the notes.
   - **Commercial flipbooks** (DearFlip, flipbookpdf.net, turn.js): don't read their code at all. Work only from the study notes and the official docs of the libraries we use.
2. **Privacy.** The user's file never leaves the device. No analytics, no third-party scripts, fonts or CDNs: everything is self-hosted. The only external requests allowed are the user-supplied `?file=` URL and the example books (Wikimedia Commons), and only when the user opens them.
3. **Licenses.** Dependencies must be MIT, Apache-2.0, BSD or ISC (fonts: OFL). Check before adding one. No GPL/LGPL, no unRAR, no turn.js, no page-flip.
4. **Performance is a requirement** (iPad with big image-heavy files):
   - Render only the current spread + 1–2 neighbors; evict the rest (LRU with a pixel budget).
   - One prioritized, cancelable render queue, paused while a page is flipping.
   - Low-res preview first, then the sharp version. Exception, measured: in image-heavy files (comics, scans) a preview costs about as much as the sharp page, so there the sharp render also makes the preview (the renderer measures both).
   - Never show an undecoded image: decode off screen and move the same `<img>` between page nodes.
   - devicePixelRatio capped at 2; ~5 MP max per canvas on iOS. Zero a canvas's width/height after converting it, then drop it.
   - Off-screen pages are kept as compressed images (WebP where encoding is supported, JPEG on Safari).
   - PDF.js runs in a Web Worker and uses range requests. CBZ is read with random access, never the whole ZIP in memory.
5. **Visual identity is a feature.** The default theme is "Ex-libris" (library language: catalog cards, accession numbers, perforated borders, typewriter numerals). Light uses the Ateliê palette, dark uses the Sebo-à-noite palette.
   - Every screen is built only from our own components in `src/ui/components/`.
   - Colors, fonts, sizes, spacing, radii and motion come only from the tokens in `src/theme/`. Stylelint enforces this for colors, font families, font sizes and radii; for spacing and motion it's on you.
   - New UI must appear in the live style guide at `#/estilo`.
   - Do not add a logo or icon until Artur asks for one.
6. **i18n.** No hard-coded UI strings. Every string goes in the typed dictionaries in `src/i18n/` (pt-BR and en). The only exceptions are the developer pages: the style guide (`#/estilo`) and the engine lab (`#/lab`).
7. **Accessibility.** Keyboard navigation, ARIA, visible focus and `prefers-reduced-motion` are required. The PDF text layer stays selectable and works with screen readers.
8. **Ready for Capacitor** (native app later):
   - Configurable base path; never hard-code `/folheia/`.
   - Routing only through the hash and local state.
   - Platform features (open file, share, storage, fetch, fullscreen) go behind small interfaces in `src/platform/`, with the web version as the only implementation for now.
   - The service worker is enabled on the web only.
   - Respect `env(safe-area-inset-*)` and use touch targets of at least 44 px.
9. **Browser support:** Safari 18+ / iPadOS 18+, plus the last 2 versions of Chrome, Edge and Firefox. PDF.js is the 6.x _legacy_ build, imported from one module only (`src/sources/pdf/`).

## Architecture (layers, each behind an interface)

- **Core is plain TypeScript, framework-free**: `sources/`, `render/`, `layout/`, `flip/`, `viewer/` engines. Never import React there. The flip animation, canvas work and gestures run outside React's render cycle (rAF + direct DOM/canvas).
- **UI layer is React 19** (`src/ui/`), styled with CSS Modules that only use theme tokens. UI subscribes to core state through small stores (`useSyncExternalStore`); no global state library unless it becomes clearly necessary.

`sources/` (PageSource: PDF, CBZ) → `render/` (queue, cache, resolution tiers) → `layout/` (single/double, cover, RTL, spreads, virtual blanks) → `flip/` (FlipEngine: our own 2D now, 3D later) → `viewer/` and `ui/`. Also `i18n/`, `theme/`, `storage/`, `platform/`, `examples.ts`.

## Commands

Node 24 (`.nvmrc`). Run `nvm use` before anything.

- `npm run dev`: dev server
- `npm run build`: production build (`dist/`)
- `npm run lint`: ESLint + Stylelint + Prettier check
- `npm run typecheck`
- `npm test`: Vitest
- `npm run fixtures`: generates test files in `fixtures/generated/` (heavy PDF, spreads, text/links PDF, CBZ, fake CBR/CB7). Needed before e2e.
- `npm run test:e2e`: Playwright (Chromium, Firefox, WebKit, emulated iPad and iPhone)
- Developer pages: `#/estilo` (live style guide) and `#/lab` (engine metrics)

## Tooling notes

- TypeScript stays on **6.0.x**: typescript-eslint doesn't support TS 7 yet (peer range `<6.1`).
- Heavy test fixtures (PDF/CBZ) are generated by scripts in `scripts/` and never committed.
- PDF.js runs from `src/sources/pdf/pdfjs.ts` only; its data files are served/emitted by `build/pdfjsAssets.ts` (GPL Liberation fonts are deliberately left out).
- URL files use our own HTTP range reads (`src/sources/http.ts`): many CORS hosts hide `Accept-Ranges`, which makes PDF.js download whole files.
- Avoid CSS `filter` on large or zoomed layers: a drop-shadow on the book stalled the main thread for minutes when zoomed. Prefer `box-shadow`.
- The flip engine must stay interactive at 60 fps: anything React does must not run per frame.
