import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';

const FIXTURE = 'fixtures/generated/heavy.pdf';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

const counter = (page: Page) => page.getByRole('button', { name: /Ir para página|Go to page/ });
const home = (page: Page) => page.getByRole('button', { name: /Escolher arquivo|Choose file/ });

test('Back closes the book, and closes a dialog first', async ({ page }) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await expect(counter(page)).toHaveText(/^1\b/, { timeout: 15_000 });
  await expect(page).toHaveURL(/#\/ler\/1\?p=1$/);

  await page.getByRole('button', { name: /Ficha do livro|Book card/ }).click();
  const card = page.getByRole('dialog');
  await expect(card).toBeVisible();
  await page.goBack();
  await expect(card).toBeHidden();
  await expect(counter(page)).toBeVisible();

  await page.goBack();
  await expect(home(page)).toBeVisible();
  await expect(page).not.toHaveURL(/ler/);
});

test('the close button returns home, and Forward reopens the library copy', async ({
  page,
  browserName,
}) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await expect(counter(page)).toHaveText(/^1\b/, { timeout: 15_000 });
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/p=2$/);
  // The copy runs in the background; WebKit's test contexts have no OPFS.
  const copied = browserName !== 'webkit';
  if (copied)
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const debug = (
            window as unknown as {
              __folheia: {
                library: { all(): Promise<{ origin?: { copy?: { status: string } } }[]> };
              };
            }
          ).__folheia;
          return (await debug.library.all())[0]?.origin?.copy?.status;
        }),
      )
      .toBe('stored');

  await page.getByRole('button', { name: /Devolver à estante|Return to shelf/ }).click();
  await expect(home(page)).toBeVisible();

  await page.goForward();
  if (copied) await expect(counter(page)).toHaveText(/^2\b/, { timeout: 15_000 });
  else await expect(home(page)).toBeVisible();
});

test('an old ?file= link with #p= opens there, and Back lands home', async ({
  page,
  baseURL,
  browserName,
}) => {
  // Firefox's Back skips the home entry put under a link's first page, since
  // nobody interacted with it, and leaves the site: browser policy, not ours.
  test.skip(browserName === 'firefox', 'Firefox skips entries without user interaction.');
  const url = `${baseURL}fixtures/generated/heavy.pdf`;
  await page.goto(`./?file=${encodeURIComponent(url)}#p=5`);
  await expect(counter(page)).toHaveText(/^(4–5|5)\b/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\?file=.*#\/ler\?p=(4|5)$/);
  await page.goBack();
  await expect(home(page)).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});
