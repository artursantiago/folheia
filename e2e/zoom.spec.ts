import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = process.env.FOLHEIA_FIXTURE ?? 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

test('zooms in with a sharp tile and pans instead of turning', async ({ page, isMobile }) => {
  test.skip(
    isMobile,
    'Zoom buttons live in the wide toolbar; pinch is covered manually on devices.',
  );
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toHaveText(/^1\s*\//, { timeout: 15_000 });
  await page.keyboard.press('ArrowRight');
  await expect(counter).toHaveText(/^2–3\s*\//);

  await page.mouse.move(400, 400);
  await page.getByRole('button', { name: /Aumentar zoom|Zoom in/ }).click();
  await page.getByRole('button', { name: /Aumentar zoom|Zoom in/ }).click();
  await expect(page.getByText(/^200%$/).first()).toBeVisible();
  await expect(page.locator('img.fx-tile').first()).toBeVisible({ timeout: 10_000 });

  // A drag while zoomed moves the page; the spread stays the same.
  const stage = (await page.locator('main').first().boundingBox())!;
  await page.mouse.move(stage.x + stage.width * 0.8, stage.y + stage.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * 0.3, stage.y + stage.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await expect(counter).toHaveText(/^2–3\s*\//);

  await page.getByRole('button', { name: /Ajustar à tela|Fit to screen/ }).click();
  await expect(page.locator('img.fx-tile')).toHaveCount(0);
});
