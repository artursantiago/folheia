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
 * Sharp renders snap to a fixed geometric ladder of widths, so a small change
 * in the page's size on screen (rotation, fullscreen, immersive mode) usually
 * lands on a rung we already have. 2 would mean powers of two.
 */
export const SCALE_STEP = 1.25;
const STEP_BASE = 256;

/** Rounds a device-pixel width up to the next rung of the ladder. */
export function scaleStep(width: number, step = SCALE_STEP): number {
  if (width <= STEP_BASE) return STEP_BASE;
  const rung = Math.ceil(Math.log(width / STEP_BASE) / Math.log(step) - 1e-9);
  return Math.round(STEP_BASE * Math.pow(step, rung));
}

/**
 * Device-pixel size to render a page displayed at `display` CSS pixels,
 * honoring the pixel-ratio cap and the per-canvas pixel limit. With `step`,
 * the width is first rounded up to the scale ladder.
 */
export function sharpSize(
  page: PageSize,
  display: PixelSize,
  pixelRatio: number,
  budget: RenderBudget,
  step?: number,
): PixelSize {
  const ratio = Math.min(pixelRatio, budget.maxPixelRatio);
  let width = step ? scaleStep(display.width * ratio, step) : display.width * ratio;
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
