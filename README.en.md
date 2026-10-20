# Folheia

**A PDF and comic book (CBZ) reader that looks and feels like a real book, page-turn effect included.** Free, open source and 100% in the browser: **your file never leaves your device.**

🔗 **Live:** <https://folheia-app.github.io/folheia/>
🇧🇷 [Leia em português](README.md) (main documentation)

> Work in progress. The MVP is being built in stages; see the [plan (in Portuguese)](docs/plano-mvp.md).

## Highlights

- Double-page spreads on wide screens, single page on phones, corner fold that follows your finger, zoom, thumbnails, outline and right-to-left reading (manga).
- Built for iPads and big, image-heavy files: only pages near the current one are rendered, and the rest are released from memory.
- No server, no account, no analytics, no third-party scripts.
- Installable (PWA) and works offline for local files.
- Open a published file with `?file=https://example.org/book.pdf` (the host must allow CORS).

## Run locally

Requires **Node 24** (`.nvmrc` included).

```bash
nvm use
npm install
npm run dev
```

`npm run build`, `npm run lint`, `npm run typecheck` and `npm test` are also available. Every push to `main` runs CI and deploys to GitHub Pages.

## Clean room

Folheia is written from scratch. Commercial flipbook products were studied only to understand the techniques; none of their code, CSS, names or assets were copied or adapted.

## License

[MIT](LICENSE) © 2026 Artur Santiago
