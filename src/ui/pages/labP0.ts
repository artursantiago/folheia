// Developer tool: experiment P0 from docs/estudo-mihon.md §6.5. Measures where
// a PDF page's time goes (decoding vs painting), what each way of keeping a
// rendered page costs (compressed Blob vs ImageBitmap), and a CBZ-like path
// that skips recompression. Plain TypeScript, driven by the lab page.
import {
  createBudget,
  previewSize,
  SCALE_STEP,
  sharpSize,
  type PixelSize,
} from '../../render/budget';
import { supportsWebpEncoding } from '../../render/encode';
import { releaseCanvas, type PdfSource } from '../../sources/pdf/PdfSource';

/** Fixed iPad Pro 11 targets, so every engine renders the same pixels. */
const IPAD = { width: 834, height: 1194, pixelRatio: 2 };
const IPAD_BUDGET = createBudget({
  maxTouchPoints: 5,
  platform: 'iPad',
  userAgent: 'iPad',
});
const QUALITY = 0.86;
/** A CBZ page stands in as a JPEG of the page at its scan resolution. */
const CBZ_WIDTH = 2000;
const CBZ_QUALITY = 0.9;

export interface EncodeCost {
  size: PixelSize;
  /** w×h×4: what a decoded page (canvas, ImageBitmap, decoded <img>) holds. */
  decodedBytes: number;
  bitmapMs: number;
  /** transferFromImageBitmap into a bitmaprenderer canvas. */
  transferMs: number;
  blobs: { type: string; ms: number; bytes: number; imgDecodeMs: number; bitmapMs: number }[];
}

export interface PageCost {
  page: number;
  /** Fresh renders, as today (page.cleanup() after each one). */
  cold: { preview: number; spread: number; single: number };
  /** Renders of a page PDF.js kept parsed: painting only. */
  warm: { preview: number; spread: number; single: number };
  encode: { spread: EncodeCost; single: EncodeCost };
  cbz: {
    jpegBytes: number;
    /** createImageBitmap(blob): full-size decode. */
    fullMs: number;
    /** createImageBitmap(blob, {resizeWidth}) to the spread size. */
    resizedMs: number;
    /** Today's CbzSource path: full decode, draw, toBlob, <img>.decode(). */
    todayMs: number;
  };
}

export interface P0Result {
  engine: string;
  secureContext: boolean;
  imageDecoder: { window: boolean; jpeg: boolean };
  webpEncoding: boolean;
  sizes: { preview: PixelSize; spread: PixelSize; single: PixelSize };
  pages: PageCost[];
}

const never = new AbortController().signal;

async function time<T>(run: () => Promise<T>): Promise<[T, number]> {
  const started = performance.now();
  const value = await run();
  return [value, performance.now() - started];
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob'))), type, quality),
  );
}

async function decodeImg(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function encodeCost(canvas: HTMLCanvasElement, types: string[]): Promise<EncodeCost> {
  const [bitmap, bitmapMs] = await time(() => createImageBitmap(canvas));
  const shown = document.createElement('canvas');
  const renderer = shown.getContext('bitmaprenderer');
  const started = performance.now();
  renderer?.transferFromImageBitmap(bitmap);
  const transferMs = performance.now() - started;
  renderer?.transferFromImageBitmap(null);
  bitmap.close();
  const blobs = [];
  for (const type of types) {
    const [blob, ms] = await time(() => toBlob(canvas, type, QUALITY));
    const [, imgDecodeMs] = await time(() => decodeImg(blob));
    const [back, bitmapMs] = await time(() => createImageBitmap(blob));
    back.close();
    blobs.push({ type: blob.type, ms, bytes: blob.size, imgDecodeMs, bitmapMs });
  }
  const { width, height } = canvas;
  return { size: { width, height }, decodedBytes: width * height * 4, bitmapMs, transferMs, blobs };
}

async function cbzCost(source: PdfSource, page: number, spread: PixelSize, types: string[]) {
  const size = source.getPageSize(page);
  const scan = await source.render(
    page,
    { width: CBZ_WIDTH, height: Math.round(CBZ_WIDTH * (size.height / size.width)) },
    never,
  );
  const jpeg = await toBlob(scan, 'image/jpeg', CBZ_QUALITY);
  releaseCanvas(scan);
  const [full, fullMs] = await time(() => createImageBitmap(jpeg));
  full.close();
  const [resized, resizedMs] = await time(() =>
    createImageBitmap(jpeg, {
      resizeWidth: spread.width,
      resizeHeight: spread.height,
      resizeQuality: 'high',
    }),
  );
  resized.close();
  const [, todayMs] = await time(async () => {
    const bitmap = await createImageBitmap(jpeg);
    const canvas = document.createElement('canvas');
    canvas.width = spread.width;
    canvas.height = spread.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, spread.width, spread.height);
    }
    bitmap.close();
    const blob = await toBlob(canvas, types[0] ?? 'image/jpeg', QUALITY);
    releaseCanvas(canvas);
    await decodeImg(blob);
  });
  return { jpegBytes: jpeg.size, fullMs, resizedMs, todayMs };
}

/** Renders each page several ways; takes a few seconds per page. */
export async function measureP0(
  source: PdfSource,
  pages: number[],
  onProgress?: (done: number) => void,
): Promise<P0Result> {
  const webp = await supportsWebpEncoding();
  // PNG is the lossless option's cold cache candidate (backlog 18b).
  const types = [...(webp ? ['image/webp'] : []), 'image/jpeg', 'image/png'];
  const hasDecoder = typeof ImageDecoder !== 'undefined';
  const imageDecoder = {
    window: hasDecoder,
    jpeg: hasDecoder && (await ImageDecoder.isTypeSupported('image/jpeg')),
  };
  const first = source.getPageSize(pages[0] ?? 0);
  const sizes = {
    preview: previewSize(first, IPAD_BUDGET),
    // Landscape, two pages side by side; portrait, one page.
    spread: sharpSize(
      first,
      { width: IPAD.height / 2, height: IPAD.width },
      IPAD.pixelRatio,
      IPAD_BUDGET,
      SCALE_STEP,
    ),
    single: sharpSize(first, IPAD, IPAD.pixelRatio, IPAD_BUDGET, SCALE_STEP),
  };
  const render = async (page: number, size: PixelSize) => {
    const [canvas, ms] = await time(() => source.render(page, size, never));
    return { canvas, ms };
  };
  const results: PageCost[] = [];
  const keep = source.cleanupAfterRender;
  try {
    for (const page of pages) {
      source.cleanupAfterRender = true;
      const cold = { preview: 0, spread: 0, single: 0 };
      for (const tier of ['preview', 'spread', 'single'] as const) {
        const { canvas, ms } = await render(page, sizes[tier]);
        releaseCanvas(canvas);
        cold[tier] = ms;
      }

      source.cleanupAfterRender = false;
      releaseCanvas((await render(page, sizes.single)).canvas); // Parses and decodes.
      const warm = { preview: 0, spread: 0, single: 0 };
      const canvases: Partial<Record<'spread' | 'single', HTMLCanvasElement>> = {};
      for (const tier of ['preview', 'spread', 'single'] as const) {
        const { canvas, ms } = await render(page, sizes[tier]);
        warm[tier] = ms;
        if (tier === 'preview') releaseCanvas(canvas);
        else canvases[tier] = canvas;
      }
      await source.releasePage(page);
      source.cleanupAfterRender = true;

      const encode = {
        spread: await encodeCost(canvases.spread!, types),
        single: await encodeCost(canvases.single!, types),
      };
      releaseCanvas(canvases.spread!);
      releaseCanvas(canvases.single!);
      const cbz = await cbzCost(source, page, sizes.spread, types);
      results.push({ page, cold, warm, encode, cbz });
      onProgress?.(results.length);
    }
  } finally {
    source.cleanupAfterRender = keep;
  }
  return {
    engine: navigator.userAgent,
    secureContext: window.isSecureContext,
    imageDecoder,
    webpEncoding: webp,
    sizes,
    pages: results,
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/** Medians across pages, rounded, for the lab table and the e2e log. */
export function summarizeP0(result: P0Result) {
  const m = (pick: (p: PageCost) => number) => Math.round(median(result.pages.map(pick)));
  const mb = (bytes: number) => Math.round((bytes / 1048576) * 10) / 10;
  const encode = (tier: 'spread' | 'single') => ({
    size: `${result.sizes[tier].width}×${result.sizes[tier].height}`,
    decodedMb: mb((result.pages[0]?.encode[tier].decodedBytes ?? 0) as number),
    bitmapMs: m((p) => p.encode[tier].bitmapMs),
    transferMs: m((p) => p.encode[tier].transferMs),
    blobs: (result.pages[0]?.encode[tier].blobs ?? []).map((b, i) => ({
      type: b.type,
      toBlobMs: m((p) => p.encode[tier].blobs[i]?.ms ?? 0),
      kb: Math.round(median(result.pages.map((p) => p.encode[tier].blobs[i]?.bytes ?? 0)) / 1024),
      imgDecodeMs: m((p) => p.encode[tier].blobs[i]?.imgDecodeMs ?? 0),
      bitmapMs: m((p) => p.encode[tier].blobs[i]?.bitmapMs ?? 0),
    })),
  });
  return {
    secureContext: result.secureContext,
    imageDecoder: result.imageDecoder,
    pages: result.pages.length,
    cold: {
      preview: m((p) => p.cold.preview),
      spread: m((p) => p.cold.spread),
      single: m((p) => p.cold.single),
    },
    warm: {
      preview: m((p) => p.warm.preview),
      spread: m((p) => p.warm.spread),
      single: m((p) => p.warm.single),
    },
    encode: { spread: encode('spread'), single: encode('single') },
    cbz: {
      jpegKb: Math.round(median(result.pages.map((p) => p.cbz.jpegBytes)) / 1024),
      fullMs: m((p) => p.cbz.fullMs),
      resizedMs: m((p) => p.cbz.resizedMs),
      todayMs: m((p) => p.cbz.todayMs),
    },
  };
}

// ---- 18b: what the lossless option (PNG sharp cache) costs ----------------

export interface LosslessCost {
  type: string;
  /** From toBlob() to its callback. */
  ms: number;
  /** Longest stretch the main thread was busy meanwhile (frames lost to encoding). */
  blockMs: number;
  bytes: number;
  imgDecodeMs: number;
}

export interface LosslessResult {
  engine: string;
  secureContext: boolean;
  sizes: { spread: PixelSize; single: PixelSize };
  /** Per page: a cold PDF.js render, then JPEG (today) and PNG (18b) for each size. */
  pages: {
    page: number;
    renderMs: number;
    spread: LosslessCost[];
    single: LosslessCost[];
  }[];
}

/**
 * Runs `work` while pinging the main thread with short timers; reports its
 * duration and the longest stall. (A tighter message loop would starve
 * Chromium's idle-time encoder and slow toBlob down.)
 */
async function blocking<T>(work: () => Promise<T>): Promise<[T, number, number]> {
  let last = performance.now();
  let longest = 0;
  let timer: number | undefined;
  const ping = () => {
    const now = performance.now();
    longest = Math.max(longest, now - last);
    last = now;
    timer = window.setTimeout(ping, 1);
  };
  timer = window.setTimeout(ping, 1);
  const started = performance.now();
  try {
    const value = await work();
    const ms = performance.now() - started;
    longest = Math.max(longest, performance.now() - last);
    return [value, ms, longest];
  } finally {
    window.clearTimeout(timer);
  }
}

async function losslessCost(canvas: HTMLCanvasElement): Promise<LosslessCost[]> {
  const costs = [];
  for (const type of ['image/jpeg', 'image/png']) {
    const [blob, ms, blockMs] = await blocking(() => toBlob(canvas, type, QUALITY));
    const [, imgDecodeMs] = await time(() => decodeImg(blob));
    costs.push({ type: blob.type, ms, blockMs, bytes: blob.size, imgDecodeMs });
  }
  return costs;
}

/** JPEG vs PNG for the sharp cache, at the iPad sizes; a couple of seconds per page. */
export async function measureLossless(
  source: PdfSource,
  pages: number[],
  onProgress?: (done: number) => void,
): Promise<LosslessResult> {
  const first = source.getPageSize(pages[0] ?? 0);
  const sizes = {
    spread: sharpSize(
      first,
      { width: IPAD.height / 2, height: IPAD.width },
      IPAD.pixelRatio,
      IPAD_BUDGET,
      SCALE_STEP,
    ),
    single: sharpSize(first, IPAD, IPAD.pixelRatio, IPAD_BUDGET, SCALE_STEP),
  };
  const results: LosslessResult['pages'] = [];
  for (const page of pages) {
    const [spreadCanvas, renderMs] = await time(() => source.render(page, sizes.spread, never));
    const spread = await losslessCost(spreadCanvas);
    releaseCanvas(spreadCanvas);
    const singleCanvas = await source.render(page, sizes.single, never);
    const single = await losslessCost(singleCanvas);
    releaseCanvas(singleCanvas);
    results.push({ page, renderMs, spread, single });
    onProgress?.(results.length);
  }
  return {
    engine: navigator.userAgent,
    secureContext: window.isSecureContext,
    sizes,
    pages: results,
  };
}

/** A few lines to read off the device: medians across pages. */
export function describeLossless(result: LosslessResult): string {
  const m = (values: number[]) => Math.round(median(values));
  const line = (tier: 'spread' | 'single', label: string) => {
    const size = result.sizes[tier];
    const parts = ['image/jpeg', 'image/png'].map((type, i) => {
      const costs = result.pages.map((p) => p[tier][i]!);
      const name = type === 'image/png' ? 'PNG' : 'JPEG';
      return (
        `${name} ${m(costs.map((c) => c.ms))} ms (trava ${m(costs.map((c) => c.blockMs))} ms), ` +
        `${m(costs.map((c) => c.bytes / 1024))} KB, decode ${m(costs.map((c) => c.imgDecodeMs))} ms`
      );
    });
    return `${label} ${size.width}×${size.height}\n  ${parts.join('\n  ')}`;
  };
  return [
    `18b · ${result.pages.length} páginas · HTTPS: ${result.secureContext ? 'sim' : 'não'}`,
    `render do PDF.js (frio): ${m(result.pages.map((p) => p.renderMs))} ms`,
    line('spread', 'deitado'),
    line('single', 'em pé'),
    result.engine,
  ].join('\n');
}
