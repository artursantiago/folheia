// Backlog 18b: what PNG (lossless) costs against JPEG for the sharp cache,
// with the lab's "Medir PNG sem perda" button. Opt-in, like P0:
//   FOLHEIA_18B=1 FOLHEIA_FIXTURE=fixtures/personal/book.pdf npx playwright test lossless
// The number that decides it comes from the real iPad (on the deployed site,
// in HTTPS); this is the desktop reference.
import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';

test.skip(!process.env.FOLHEIA_18B, 'Set FOLHEIA_18B=1 to measure the lossless option');
test.skip(!existsSync(FIXTURE), `${FIXTURE} missing`);

test('18b: JPEG vs PNG for the sharp cache', async ({ page }, info) => {
  test.setTimeout(300_000);
  await page.goto('#/lab');
  await page.getByLabel('Abrir PDF').setInputFiles(FIXTURE);
  await expect(page.getByTestId('first-sharp')).toHaveText(/^\d+ ms$/, { timeout: 60_000 });
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: /Medir PNG/ }).click();
  const output = page.getByTestId('lossless');
  await expect(output).toHaveText(/^18b/, { timeout: 240_000 });
  console.log(`[${info.project.name}]\n${await output.textContent()}`);
});
