// The only module that imports PDF.js (6.x legacy build). Everything else
// goes through PdfSource, so swapping builds or versions stays local.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };

/** Data files emitted by build/pdfjsAssets.ts, resolved against the page base. */
export function pdfjsDataUrls() {
  const base = new URL('pdfjs/', document.baseURI).href;
  return {
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
  };
}
