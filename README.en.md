<p align="center"><img src="public/icons/icon-192.png" width="96" height="96" alt="Folheia"></p>

# Folheia

**Read books, comics and manga by leafing through them, like on paper.**

🔗 **Live:** <https://folheia-app.github.io/folheia/>
🇧🇷 [Leia em português](README.md) (main documentation)

## What it is

Folheia is your reading collection: books, comics, manga and magazines in one place, read page by page. Double-page spreads on wide screens, a single page on phones, a corner fold that follows your finger, zoom, thumbnails, outline and right-to-left reading for manga. Built for iPads and big, image-heavy files.

> A personal, experimental project, in progress. The [roadmap (in Portuguese)](docs/roteiro.md) covers what's next: a personal library with shelves, page bookmarks and catalogs.

## How it works

- **Formats:** PDF and CBZ (or a ZIP of images). Not CBR or CB7 yet.
- **On your device:** everything runs in the browser. No server, no account, no analytics, no third-party scripts; your file never leaves your device.
- **Light on heavy files:** only pages near the current one are rendered; the rest are released from memory.
- **Installable:** works as an app (PWA) and opens local files offline.
- **By link:** `?file=https://example.org/book.pdf` opens a published file, if its host allows it (CORS).

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
