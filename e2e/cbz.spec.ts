import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const CBZ = 'fixtures/generated/manga.cbz';

test.skip(!existsSync(CBZ), 'Run "npm run fixtures" first');

test('reads a right-to-left CBZ with a double-page spread', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(CBZ);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toHaveText(/^1\s*\/\s*11$/, { timeout: 15_000 });
  await expect(page.locator('header').getByText('Folheia CBZ fixture')).toBeVisible();
  await expect(page.locator('.fx-page img').first()).toBeVisible();

  // Manga reads right to left: the left arrow moves forward.
  await page.keyboard.press('ArrowLeft');
  await expect(counter).toHaveText(isMobile ? /^2\s*\// : /^2–3\s*\//);
  if (!isMobile) {
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    // Page 6 is a double-page image: it fills the spread on its own.
    await expect(counter).toHaveText(/^6\s*\//, { timeout: 5_000 });
  }
});

for (const [file, message] of [
  ['fixtures/generated/comic.cbr', /CBR/],
  ['fixtures/generated/comic.cb7', /CB7/],
] as const) {
  test(`explains how to convert ${file.split('.').pop()}`, async ({ page }) => {
    await page.goto('./');
    await page.locator('input[type=file]').setInputFiles(file);
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('alert')).toContainText(/CBZ/);
  });
}
