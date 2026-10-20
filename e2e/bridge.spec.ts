// The network bridge extension, loaded unpacked into Chromium, driven from
// the #/lab panel. The "foreign site" is a local server on 127.0.0.1 that
// sends no CORS headers, so the page itself (on localhost) can't read it.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { launchWithBridge, type Harness } from './bridge-harness';

// Chromium loads the extension unpacked; Firefox as a temporary add-on.
test.skip(
  ({ browserName }) => browserName === 'webkit',
  'Safari extensions need Xcode (see docs/estudo-extensao.md)',
);

const APP = 'http://localhost:5174/#/lab';
const BIG = 8 << 20;
/** A 1×1 PNG. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const imageReferers: string[] = [];

let harness: Harness;
let server: Server;
let target: string;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  const project = test.info().project.name;
  test.skip(project !== 'chromium' && project !== 'firefox', 'Desktop Chromium and Firefox only');

  const big = Buffer.alloc(BIG, 7);
  server = createServer((request, response) => {
    if (request.url === '/echo') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(request.headers));
    } else if (request.url === '/big') {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(big);
    } else if (request.url?.startsWith('/pixel.png')) {
      imageReferers.push(request.headers.referer ?? '');
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(PIXEL);
    } else if (request.url === '/slow') {
      // Never answers: the client has to abort.
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  target = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

  harness = await launchWithBridge([], project === 'firefox' ? 'firefox' : 'chromium');
  context = harness.context;
  page = await context.newPage();
  await page.goto(APP);
});

test.afterAll(async () => {
  await harness?.close();
  server?.closeAllConnections();
  server?.close();
});

async function fetchFromLab(url: string, route: 'auto' | 'só fetch' | 'só ponte', extra = {}) {
  const panel = page.getByTestId('bridge-panel');
  await panel.getByLabel('URL da ponte').fill(url);
  const { referer = '', userAgent = '' } = extra as { referer?: string; userAgent?: string };
  await panel.getByLabel('Referer', { exact: true }).fill(referer);
  await panel.getByLabel('User-Agent', { exact: true }).fill(userAgent);
  await panel.getByLabel(route).check();
  await panel.getByRole('button', { name: 'Buscar' }).click();
}

test('detects the extension and answers with its protocol', async () => {
  await expect(page.getByTestId('bridge-status')).toHaveText(
    new RegExp(
      `^extension · ${test.info().project.name === 'firefox' ? 'firefox' : 'chrome'} · v0\\.1\\.0`,
    ),
  );
});

test('plain fetch is blocked by CORS; the bridge reads it, with Referer and User-Agent', async () => {
  await fetchFromLab(`${target}/echo`, 'só fetch');
  await expect(page.getByTestId('bridge-error')).toContainText('blocked');

  await fetchFromLab(`${target}/echo`, 'auto', {
    referer: 'https://example.org/reader/',
    userAgent: 'FolheiaBridgeTest/1.0',
  });
  await expect(page.getByTestId('bridge-via')).toHaveText('bridge');
  await expect(page.getByTestId('bridge-http-status')).toHaveText(/^200/);
  const echoed = JSON.parse((await page.getByTestId('bridge-text').textContent()) ?? '{}');
  expect(echoed.referer).toBe('https://example.org/reader/');
  expect(echoed['user-agent']).toBe('FolheiaBridgeTest/1.0');
  // Never the user's identity: no cookies, no page origin.
  expect(echoed.cookie).toBeUndefined();
  expect(echoed.origin ?? '').not.toContain('localhost:5174');
});

test('streams a large binary body and measures it', async () => {
  const info = test.info();
  await fetchFromLab(`${target}/big`, 'só ponte');
  await expect(page.getByTestId('bridge-bytes')).toHaveText(String(BIG), { timeout: 30_000 });
  const ms = Number((await page.getByTestId('bridge-page-ms').textContent())?.replace(/\D/g, ''));
  const mbps = (BIG / 1048576 / (ms / 1000)).toFixed(1);
  info.annotations.push({ type: 'bridge 8 MB (ms)', description: `${ms} ms · ${mbps} MB/s` });
  console.log(`[bridge] 8 MB in ${ms} ms (${mbps} MB/s)`);
});

test("sets a Referer on the page's own <img> requests to an approved host", async () => {
  const panel = page.getByTestId('bridge-panel');
  await panel.getByLabel('Imagem direta (URL)').fill(`${target}/pixel.png`);
  await panel.getByRole('button', { name: 'Mostrar com <img>' }).click();
  await expect(page.getByTestId('image-status')).toHaveText('loaded · sem regra');
  expect(imageReferers.at(-1)).toContain('localhost:5174');

  await panel.getByLabel('Referer da imagem').fill('https://example.org/reader/');
  await panel.getByRole('button', { name: 'Mostrar com <img>' }).click();
  await expect(page.getByTestId('image-status')).toHaveText('loaded · regra aplicada a 127.0.0.1');
  expect(imageReferers.at(-1)).toBe('https://example.org/reader/');
});

test('refuses destinations the user never approved', async () => {
  await fetchFromLab('https://folheia-not-approved.example/', 'só ponte');
  await expect(page.getByTestId('bridge-error')).toContainText('not-allowed');
  await expect(page.getByRole('button', { name: /Pedir acesso/ })).toBeVisible();
});

test('aborts a request in flight', async () => {
  await fetchFromLab(`${target}/slow`, 'só ponte');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByTestId('bridge-error')).toContainText('aborted');
});

test('answers on the published site and stays silent anywhere else', async () => {
  // Pages served by Playwright under those URLs; the content script goes by URL.
  await context.route(/^https:\/\/(artursantiago\.github\.io|outsider\.example)\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>t</title>' }),
  );
  const hello = async (url: string) => {
    const other = await context.newPage();
    await other.goto(url);
    const answered = await other.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          window.addEventListener('message', (event) => {
            if ((event.data as { from?: string })?.from === 'bridge') resolve(true);
          });
          const hi = {
            channel: 'folheia-bridge',
            from: 'page',
            type: 'hello',
            id: 'x',
            protocol: 1,
          };
          window.postMessage(hi, '*');
          setTimeout(() => resolve(false), 1000);
        }),
    );
    await other.close();
    return answered;
  };
  expect(await hello('https://artursantiago.github.io/folheia/')).toBe(true);
  expect(await hello('https://artursantiago.github.io/another-project/')).toBe(false);
  expect(await hello('https://outsider.example/folheia/')).toBe(false);
});
