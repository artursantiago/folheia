import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

test('opens a heavy PDF fast and keeps memory bounded while leafing through', async ({
  page,
}, info) => {
  await page.goto('#/lab');
  await page.getByLabel('Abrir PDF').setInputFiles(FIXTURE);

  const firstPreview = page.getByTestId('first-preview');
  const firstSharp = page.getByTestId('first-sharp');
  await expect(firstPreview).toHaveText(/^\d+ ms$/, { timeout: 15_000 });
  await expect(firstSharp).toHaveText(/^\d+ ms$/, { timeout: 15_000 });
  const previewMs = Number((await firstPreview.textContent())?.replace(/\D/g, ''));
  const sharpMs = Number((await firstSharp.textContent())?.replace(/\D/g, ''));
  info.annotations.push({ type: 'first preview (ms)', description: String(previewMs) });
  info.annotations.push({ type: 'first sharp (ms)', description: String(sharpMs) });
  expect(previewMs).toBeLessThan(1500);
  expect(sharpMs).toBeLessThan(3000);

  // Leaf through 40 spreads at reading pace; only nearby pages may stay sharp.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);
  }
  await expect(page.locator('[data-testid=spread] img[data-tier=sharp]')).toHaveCount(2, {
    timeout: 15_000,
  });
  const sharpCount = Number((await page.getByTestId('sharp-count').textContent())?.split(' ')[0]);
  info.annotations.push({ type: 'sharp pages in memory', description: String(sharpCount) });
  console.log(
    `[${info.project.name}] first preview ${previewMs} ms · first sharp ${sharpMs} ms · sharp in memory ${sharpCount}`,
  );
  expect(sharpCount).toBeLessThanOrEqual(6);
});
