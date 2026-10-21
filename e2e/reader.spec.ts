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

test('best quality keeps the page on screen as PNG', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The settings button lives in the wide toolbar.');
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await expect(page.getByRole('button', { name: /Ir para página|Go to page/ })).toBeVisible({
    timeout: 15_000,
  });
  const typeOnScreen = () =>
    page.evaluate(async () => {
      const img = document.querySelector<HTMLImageElement>('.fx-page img.fx-img');
      if (!img || img.naturalWidth < 400) return 'not sharp yet';
      // A replaced image's URL is revoked while it is still on screen for a frame.
      return fetch(img.src).then(
        (response) => response.blob().then((blob) => blob.type),
        () => 'replaced',
      );
    });
  await expect.poll(typeOnScreen, { timeout: 15_000 }).toBe('image/jpeg');

  await page.getByRole('button', { name: /^(Ajustes|Settings)$/ }).click();
  await page.getByRole('switch', { name: /Qualidade máxima|Best quality/ }).click();
  await expect.poll(typeOnScreen, { timeout: 15_000 }).toBe('image/png');
});

test('remembers where a local file was left, across reloads', async ({ page, isMobile }) => {
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  await expect(counter).toHaveText(/^1\s*\//, { timeout: 15_000 });
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const left = isMobile ? 4 : 6;
  await expect(counter).toHaveText(new RegExp(`^${left}\\b`), { timeout: 5_000 });

  // Wait for the progress to be written, then start the app afresh.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { library } = (
          window as unknown as {
            __folheia: { library: { all(): Promise<{ lastPage: number }[]> } };
          }
        ).__folheia;
        return (await library.all()).map((book) => book.lastPage);
      }),
    )
    .toContain(left);
  await page.goto('./');
  await page.reload();
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await page
    .getByRole('button', { name: new RegExp(`(Continuar da página|Continue from page) ${left}`) })
    .click();
  await expect(counter).toHaveText(new RegExp(`^${left}\\b`), { timeout: 15_000 });
});

test('opens books by URL (?file=) with range reads', async ({ page, baseURL }) => {
  const ranges: string[] = [];
  page.on('request', (request) => {
    const range = request.headers().range;
    if (request.url().includes('fixtures/generated/') && range) ranges.push(range);
  });
  const counter = page.getByRole('button', { name: /Ir para página|Go to page/ });
  for (const file of ['heavy.pdf', 'manga.cbz']) {
    await page.goto(`./?file=${encodeURIComponent(`${baseURL}fixtures/generated/${file}`)}`);
    await expect(counter).toHaveText(/^1\b/, { timeout: 15_000 });
    await expect(page.locator('.fx-page img').first()).toBeVisible();
  }
  expect(ranges.length).toBeGreaterThan(2);
});
