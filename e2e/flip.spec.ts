/// <reference lib="dom" />
// The probe runs inside the page, so this file needs the DOM types.
import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

interface TurnSample {
  /** Worst state of the resting pages right after the turn ended. */
  atEnd: 'sharp' | 'preview' | 'blank';
  /** Milliseconds from the end of the turn until every resting page was sharp. */
  sharpAfter?: number;
}

interface FlipProbe {
  turns: TurnSample[];
  /** Frame intervals while a page was moving. */
  frames: number[];
  /** Frames during turns where some page on screen had no image. */
  blankFrames: number;
}

/**
 * Samples the real reader every animation frame: what each page shows when a
 * turn ends, how long it takes to get sharp, and how smooth the turn itself is.
 * Previews are at most 360 px on the long side, so anything bigger is sharp.
 */
async function installProbe(page: Page) {
  await page.evaluate(() => {
    const probe = { turns: [], frames: [], blankFrames: 0 } as {
      turns: { atEnd: string; t: number; sharpAfter?: number }[];
      frames: number[];
      blankFrames: number;
    };
    (window as unknown as { __flipProbe: typeof probe }).__flipProbe = probe;
    const rank = { blank: 0, preview: 1, sharp: 2 } as const;
    type State = keyof typeof rank;
    const stateOf = (node: Element): State => {
      if (node.hasAttribute('data-blank') || node.hasAttribute('data-failed')) return 'sharp';
      const img = node.querySelector<HTMLImageElement>('img:not(.fx-tile)');
      if (!img || !img.complete || !img.naturalWidth) return 'blank';
      return Math.max(img.naturalWidth, img.naturalHeight) > 400 ? 'sharp' : 'preview';
    };
    let last = performance.now();
    let lastLeaf: Element | null = null;
    const tick = (now: number) => {
      const book = document.querySelector('.fx-book');
      // Each turn builds its own leaf; queued turns swap it without a resting frame.
      const leaf = book?.querySelector(':scope > .fx-leaf') ?? null;
      const turning = !!leaf;
      const states = [...(book?.querySelectorAll('.fx-page[data-page]') ?? [])].map(stateOf);
      const worst = states.reduce<State>((w, s) => (rank[s] < rank[w] ? s : w), 'sharp');
      if (turning) {
        probe.frames.push(now - last);
        if (worst === 'blank') probe.blankFrames++;
      }
      if (lastLeaf && leaf !== lastLeaf) probe.turns.push({ atEnd: worst, t: now });
      const current = probe.turns.at(-1);
      if (current && current.sharpAfter === undefined && !turning && worst === 'sharp')
        current.sharpAfter = Math.round(now - current.t);
      last = now;
      lastLeaf = leaf;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function percentile(values: number[], p: number) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

function summarize(probe: FlipProbe) {
  const count = (state: TurnSample['atEnd']) => probe.turns.filter((t) => t.atEnd === state).length;
  const sharpAfter = probe.turns.flatMap((t) => (t.sharpAfter === undefined ? [] : [t.sharpAfter]));
  return {
    turns: probe.turns.length,
    sharpAtEnd: count('sharp'),
    previewAtEnd: count('preview'),
    blankAtEnd: count('blank'),
    sharpAfterMedian: percentile(sharpAfter, 50),
    sharpAfterP90: percentile(sharpAfter, 90),
    frameP95: Math.round(percentile(probe.frames, 95)),
    // Headless WebKit idles at ~20 ms per frame, so only count clearly dropped frames.
    slowFrames: probe.frames.filter((ms) => ms > 34).length,
    frames: probe.frames.length,
    blankFrames: probe.blankFrames,
  };
}

async function leaf(page: Page, turns: number, pauseMs: number) {
  await page.evaluate(() => {
    const probe = (window as unknown as { __flipProbe: FlipProbe }).__flipProbe;
    probe.turns.length = 0;
    probe.frames.length = 0;
    probe.blankFrames = 0;
  });
  for (let i = 0; i < turns; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(pauseMs);
  }
  // Let the last page settle before reading the numbers.
  await page.waitForTimeout(2500);
  return summarize(
    await page.evaluate(() => (window as unknown as { __flipProbe: FlipProbe }).__flipProbe),
  );
}

test('turning pages: what shows up and how smooth it is', async ({ page }, info) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toBeVisible({ timeout: 20_000 });
  await installProbe(page);
  // Give the first spread time to get sharp, as a reader would.
  await page.waitForTimeout(3000);

  const reading = await leaf(page, 12, 1800);
  const hurried = await leaf(page, 10, 450);
  for (const [name, result] of Object.entries({ reading, hurried })) {
    info.annotations.push({ type: name, description: JSON.stringify(result) });
    console.log(`[${info.project.name}] ${name} ${JSON.stringify(result)}`);
  }
  expect(reading.turns).toBeGreaterThan(0);
});
