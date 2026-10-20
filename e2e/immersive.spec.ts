import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

async function open(page: Page) {
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toBeVisible({ timeout: 15_000 });
  return counter;
}

const stageHeight = async (page: Page) =>
  (await page.locator('.fx-stage').boundingBox())?.height ?? 0;

test('immersive mode: just the book, a slider, and it is remembered', async ({ page }) => {
  await page.goto('./');
  const counter = await open(page);
  const before = await stageHeight(page);
  const back = page.getByRole('button', { name: /Devolver à estante|Return to shelf/ });

  await page.getByRole('button', { name: /^(Modo imersivo|Immersive mode)$/ }).click();
  await expect(back).toBeHidden();
  await expect.poll(() => stageHeight(page)).toBeGreaterThan(before);

  // Dragging only changes the label; the jump happens on release (keyboard steps commit too).
  const slider = page.getByRole('slider', { name: /Posição no livro|Position in the book/ });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(counter).toHaveText(/^(\d+–)?(\d+)\s*\/\s*\2$/, { timeout: 5_000 });

  // Remembered for the next book.
  await page.reload();
  await open(page);
  await expect(back).toBeHidden();

  // F toggles it off (full screen, if any, is left too).
  await page.locator('.fx-stage').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('f');
  await expect(back).toBeVisible();
});

test('immersive mode with a hiding bar: a tap in the middle brings it back', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'folheia:preferences',
      JSON.stringify({ immersive: true, immersiveBar: 'auto' }),
    ),
  );
  await page.goto('./');
  await open(page);
  const reader = page.locator('[data-immersive]');
  await expect(reader).toHaveAttribute('data-immersive', 'auto');
  await expect(reader).toHaveAttribute('data-chrome', 'hidden', { timeout: 6_000 });

  const book = (await page.locator('.fx-book').boundingBox())!;
  await page.mouse.click(book.x + book.width / 2, book.y + book.height / 2);
  await expect(reader).toHaveAttribute('data-chrome', 'visible');
});
