// Experiment P0 (docs/estudo-mihon.md §6.5): runs the lab's measurement and
// saves it. Opt-in, since it takes a while per engine:
//   FOLHEIA_P0=1 FOLHEIA_FIXTURE=fixtures/personal/book.pdf npx playwright test p0
// FOLHEIA_P0_NO_DECODER=1 turns PDF.js' ImageDecoder off (as outside HTTPS).
// Results go to FOLHEIA_P0_OUT (Playwright empties test-results/ on every run).
import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';
const SPREAD = Number(process.env.FOLHEIA_P0_SPREAD ?? 5);
const NO_DECODER = process.env.FOLHEIA_P0_NO_DECODER === '1';
const OUT = process.env.FOLHEIA_P0_OUT ?? 'test-results';

test.skip(!process.env.FOLHEIA_P0, 'Set FOLHEIA_P0=1 to run experiment P0');
test.skip(!existsSync(FIXTURE), `${FIXTURE} missing`);

test('P0: decode vs paint, toBlob vs ImageBitmap', async ({ page }, info) => {
  test.setTimeout(600_000);
  await page.goto('#/lab');
  if (NO_DECODER) await page.getByRole('switch', { name: 'ImageDecoder' }).click();
  await page.getByLabel('Abrir PDF').setInputFiles(FIXTURE);
  await expect(page.getByTestId('first-sharp')).toHaveText(/^\d+ ms$/, { timeout: 60_000 });
  for (let i = 0; i < SPREAD; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: /Medir P0/ }).click();
  const output = page.getByTestId('p0');
  await expect(output).toHaveText(/^\{/, { timeout: 540_000 });
  const result = JSON.parse((await output.textContent()) ?? '{}') as { summary: unknown };
  const book = basename(FIXTURE).replace(/\.\w+$/, '');
  const name = `p0-${book}-${info.project.name}${NO_DECODER ? '-nodecoder' : ''}`;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(result, null, 2));
  console.log(`[${name}] ${JSON.stringify(result.summary)}`);
});
