import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = 'fixtures/generated/text.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

test('pages carry selectable text and working links', async ({ page }) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toHaveText(/^1\s*\//, { timeout: 15_000 });

  await expect(page.locator('.fx-text').getByText('Chapter 1')).toBeAttached({ timeout: 10_000 });
  const web = page.locator('a.fx-link[href="https://example.org/"]');
  await expect(web).toHaveAttribute('target', '_blank');

  await page.locator('a.fx-link[href^="#p="]').click();
  await expect(counter).toHaveText(/(^4|^4–5)\s*\//, { timeout: 5_000 });
});
