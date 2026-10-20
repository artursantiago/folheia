import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

test('opens a PDF from the home screen and leafs through it', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);

  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.fx-page img').first()).toBeVisible();
  await expect(counter).toHaveText(/^1\s*\/\s*\d+$/);

  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText(isMobile ? /^2\s*\// : /^2–3\s*\//, { timeout: 5_000 });
  await expect(page).toHaveURL(/#p=2$/);

  // Dragging the free corner across the spine turns the page.
  if (!isMobile) {
    const book = (await page.locator('.fx-book').boundingBox())!;
    await page.mouse.move(book.x + book.width - 6, book.y + book.height - 6);
    await page.mouse.down();
    await page.mouse.move(book.x + book.width * 0.2, book.y + book.height * 0.9, { steps: 15 });
    await page.mouse.up();
    await expect(counter).toHaveText(/^4–5\s*\//, { timeout: 5_000 });
  }

  await page.keyboard.press('End');
  await expect(counter).toHaveText(/\d+\s*\/\s*\d+/);
  await page.getByRole('button', { name: /Devolver à estante|Return to shelf/ }).click();
  await expect(page.getByRole('button', { name: /Escolher arquivo|Choose file/ })).toBeVisible();
});

test('reopens at the page in the address', async ({ page }) => {
  await page.goto('./#p=9');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toHaveText(/(^8–9|^9)\s*\//, { timeout: 15_000 });
});
