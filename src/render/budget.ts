import type { PageSize } from '../sources/types';

export interface RenderBudget {
  /** devicePixelRatio is capped here: beyond 2x the gain is invisible and the memory isn't. */
  maxPixelRatio: number;
  /** Largest canvas we ever allocate, in pixels. */
  maxCanvasPixels: number;
  /** Total compressed bytes kept in the page cache. */
  maxCacheBytes: number;
  /** Long side of preview renders, in pixels. */
  previewLongSide: number;
}

export interface Environment {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
  deviceMemory?: number | undefined;
}

export function isAppleTouchDevice(env: Environment): boolean {
  // iPadOS reports itself as a Mac; touch points give it away.
  return (
    /iPhone|iPad|iPod/.test(env.userAgent) || (/Mac/.test(env.platform) && env.maxTouchPoints > 1)
  );
}

export function createBudget(env: Environment): RenderBudget {
  const ios = isAppleTouchDevice(env);
  const lowMemory = (env.deviceMemory ?? 8) <= 4;
  return {
    maxPixelRatio: 2,
    // WebKit on iOS kills tabs well before desktop browsers; PDF.js uses ~5 MP there too.
    maxCanvasPixels: ios ? 5_000_000 : lowMemory ? 8_000_000 : 16_000_000,
    maxCacheBytes: ios || lowMemory ? 48 * 1024 * 1024 : 128 * 1024 * 1024,
    previewLongSide: 360,
  };
}

export function currentEnvironment(): Environment {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    maxTouchPoints: nav.maxTouchPoints,
    platform: nav.platform,
    userAgent: nav.userAgent,
    deviceMemory: nav.deviceMemory,
  };
}

export interface PixelSize {
  width: number;
  height: number;
}

/**
 * Device-pixel size to render a page displayed at `display` CSS pixels,
 * honoring the pixel-ratio cap and the per-canvas pixel limit.
 */
export function sharpSize(
  page: PageSize,
  display: PixelSize,
  pixelRatio: number,
  budget: RenderBudget,
): PixelSize {
  const ratio = Math.min(pixelRatio, budget.maxPixelRatio);
  let width = display.width * ratio;
  let height = width * (page.height / page.width);
  const pixels = width * height;
  if (pixels > budget.maxCanvasPixels) {
    const shrink = Math.sqrt(budget.maxCanvasPixels / pixels);
    width *= shrink;
    height *= shrink;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

export function previewSize(page: PageSize, budget: RenderBudget): PixelSize {
  const long = budget.previewLongSide;
  return page.width >= page.height
    ? { width: long, height: Math.round(long * (page.height / page.width)) }
    : { width: Math.round(long * (page.width / page.height)), height: long };
}
