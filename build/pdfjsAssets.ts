import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Serves (dev) and emits (build) the PDF.js data files under `pdfjs/`:
 * CMaps, standard fonts, wasm decoders and ICC profiles.
 * Liberation fonts are GPL-licensed, so they are left out on purpose;
 * PDF.js falls back to system fonts for those standard faces.
 */
const ROOT = resolve('node_modules/pdfjs-dist');
const DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
const EXCLUDE = /^(LiberationSans|LICENSE_LIBERATION)/;

function listFiles(): { dir: string; name: string }[] {
  return DIRS.flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => !EXCLUDE.test(name) && statSync(join(ROOT, dir, name)).isFile())
      .map((name) => ({ dir, name })),
  );
}

export function pdfjsAssets(): Plugin {
  return {
    name: 'folheia:pdfjs-assets',
    configureServer(server) {
      const allowed = new Set(listFiles().map(({ dir, name }) => `${dir}/${name}`));
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/\/pdfjs\/([^?#]+)/);
        const file = match?.[1] ? decodeURIComponent(match[1]) : undefined;
        if (!file || !allowed.has(file)) return next();
        if (file.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
        createReadStream(join(ROOT, file)).pipe(res);
      });
    },
    generateBundle() {
      for (const { dir, name } of listFiles()) {
        this.emitFile({
          type: 'asset',
          fileName: `pdfjs/${dir}/${name}`,
          source: readFileSync(join(ROOT, dir, name)),
        });
      }
    },
  };
}
