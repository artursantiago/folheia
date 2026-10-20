/// <reference lib="dom" />
// The probe runs inside the page, so this file needs the DOM types.
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';
const PANS = 8;

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

/**
 * Zoomed in, every pan asks for new sharp tiles of the pages on screen. This
 * measures how long after letting go they are all in (it includes the 220 ms
 * the zoom waits for the gesture to settle).
 */
test('zoomed in: sharp tiles after each pan', async ({ page }, info) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const probe = { ups: [] as number[], loads: [] as number[] };
    (window as unknown as { __tiles: typeof probe }).__tiles = probe;
    document.addEventListener(
      'load',
      (event) => {
        if ((event.target as Element).classList?.contains('fx-tile'))
          probe.loads.push(performance.now());
      },
      true,
    );
    document.addEventListener('pointerup', () => probe.ups.push(performance.now()), true);
  });

  await page.keyboard.press('+');
  await page.keyboard.press('+');
  await expect(page.locator('img.fx-tile').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);

  const stage = (await page.locator('.fx-stage').boundingBox())!;
  const y = stage.y + stage.height / 2;
  for (let i = 0; i < PANS; i++) {
    const [from, to] = i % 2 ? [0.35, 0.65] : [0.65, 0.35];
    await page.mouse.move(stage.x + stage.width * from, y);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * to, y + (i % 3) * 20, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1800);
  }
  const { ups, loads } = await page.evaluate(
    () => (window as unknown as { __tiles: { ups: number[]; loads: number[] } }).__tiles,
  );
  // Each pan: from letting go to the last tile that loaded before the next pan.
  const waits = ups.slice(-PANS).flatMap((up, i, all) => {
    const next = all[i + 1] ?? Infinity;
    const last = loads.filter((t) => t > up && t < next).at(-1);
    return last === undefined ? [] : [Math.round(last - up)];
  });
  const sorted = [...waits].sort((a, b) => a - b);
  const result = {
    pans: PANS,
    withTiles: waits.length,
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted.at(-1),
  };
  info.annotations.push({ type: 'tiles', description: JSON.stringify(result) });
  console.log(`[${info.project.name}] tiles ${JSON.stringify(result)}`);
  expect(waits.length).toBeGreaterThan(0);
});
