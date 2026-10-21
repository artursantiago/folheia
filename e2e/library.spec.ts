import { expect, test, type Page } from '@playwright/test';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIXTURE = 'fixtures/generated/manga.cbz';

test.skip(!existsSync(FIXTURE), `Run "npm run fixtures" first (${FIXTURE} missing)`);

interface Debug {
  __folheia: {
    library: { all(): Promise<{ accession?: number; origin?: { copy?: { status: string } } }[]> };
    files: { usage(): Promise<{ bytes: number; files: number }> };
  };
}

const libraryState = (page: Page) =>
  page.evaluate(async () => {
    const { library, files } = (window as unknown as Debug).__folheia;
    const books = await library.all();
    return {
      accessions: books.map((book) => book.accession),
      copy: books[0]?.origin?.copy?.status,
      usage: await files.usage(),
    };
  });

test('a local file enters the library and is copied in the background', async ({
  playwright,
  browserName,
  isMobile,
  baseURL,
}) => {
  test.skip(isMobile, 'Covered by the desktop engines.');
  // WebKit refuses the OPFS in Playwright's ephemeral contexts: use a persistent one.
  const profile = mkdtempSync(join(tmpdir(), 'folheia-e2e-'));
  const context = await playwright[browserName].launchPersistentContext(profile, {
    baseURL: baseURL!,
  });
  try {
    const page = await context.newPage();
    await page.goto('./');
    await page.locator('input[type=file]').setInputFiles(FIXTURE);
    await expect(page.getByRole('button', { name: /Ir para página|Go to page/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect
      .poll(() => libraryState(page), { timeout: 15_000 })
      .toEqual({
        accessions: [1],
        copy: 'stored',
        usage: { bytes: statSync(FIXTURE).size, files: 1 },
      });
  } finally {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
});

test('without file storage the book still opens, and the reason is kept', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(StorageManager.prototype, 'getDirectory', {
      value: () => Promise.reject(new DOMException('No', 'SecurityError')),
    });
  });
  await page.goto('./');
  await page.locator('input[type=file]').setInputFiles(FIXTURE);
  await expect(page.getByRole('button', { name: /Ir para página|Go to page/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { library } = (window as unknown as Debug).__folheia;
        const [book] = await library.all();
        return book?.origin?.copy;
      }),
    )
    .toEqual({ status: 'missing', reason: 'unavailable' });
});
