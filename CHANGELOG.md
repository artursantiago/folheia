# Changelog

All notable changes to Folheia are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/) as explained in [docs/versionamento.md](docs/versionamento.md).

The stable version is live at <https://folheia-app.github.io/folheia/>; what's in "Unreleased" can be tried early in the preview at <https://folheia-app.github.io/folheia/next/>.

## [Unreleased]

## [0.2.0] - 2026-10-20

### Added

- A "Best quality" option in the reading settings keeps sharp pages and zoomed-in areas lossless, for crisper lines in comics. It's off by default and uses more memory.

### Fixed

- Zooming in and out many times (with a pinch or the buttons) no longer brings the reader down on the iPad.
- In heavy scanned books, the next pages get ready sooner: a page that was already sharp is no longer rendered again as a preview.

## [0.1.0] - 2026-10-20

The first version: a reader that turns pages like paper, for books, comics and manga in PDF and CBZ, built for the iPad and for big, image-heavy files.

### Added

- Reading by leafing through: double-page spreads on wide screens, a single page on phones, and a corner fold that follows your finger, the mouse or the keyboard.
- PDF and CBZ (or a ZIP of images) files, from your device or from a link (`?file=`), with a password dialog for protected PDFs. CBR and CB7 files get instructions to convert them.
- Right-to-left reading for manga, from the settings, the link, the PDF or the `ComicInfo.xml` of a CBZ; covers shown alone; double-page images and uneven spreads lined up with blank pages.
- Zoom with sharp tiles, pinch and pan; thumbnails and the table of contents in a side drawer; selectable PDF text and clickable links.
- Immersive mode, just the book: no header, a page slider in a slim bar, and an option to hide the bar by itself.
- Remembers the page you stopped at and offers to continue; the book card shows the book's details and source.
- A collection of public-domain examples to try.
- Installable as an app (PWA), with local files working offline; "open with Folheia" on desktop Chrome and Edge.
- English and Portuguese, light and dark themes, keyboard shortcuts and screen-reader support.
- The "F" monogram icon.

### Performance

- Only the pages near the current one are rendered, with a low-resolution preview first and the sharp version after; the rest is released from memory.
- Fast page turns don't leave blank pages: the next pages are planned before the queue resumes, and the cache drops the farthest pages first.
- CBZ pages are shown straight from the archive's own images, with no re-encoding.
- Cached pages are JPEG on every browser, and zoomed-in PDF pages stay decoded between tile renders.

[Unreleased]: https://github.com/folheia-app/folheia/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/folheia-app/folheia/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/folheia-app/folheia/releases/tag/v0.1.0
