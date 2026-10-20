// Live checks of the bridge against real sites. Off by default (network,
// rate limits): FOLHEIA_E2E_LIVE=1.
//   - MangaDex API: CORS allows only mangadex.org and localhost (not 127.0.0.1).
//   - Internet Archive download/: public-domain book (The Wonderful Wizard of Oz, 1900).
//   - Probes: FOLHEIA_BRIDGE_PROBES=<file.json>, a list of { name, url, headers? }
//     kept out of the repo (e.g. in fixtures/personal/). Each URL is fetched
//     once by the page and once through the bridge; results are printed and,
//     with FOLHEIA_BRIDGE_PROBES_OUT=<file.json>, saved.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer, type ViteDevServer } from 'vite';
import { launchWithBridge, type Harness } from './bridge-harness';

test.skip(!process.env.FOLHEIA_E2E_LIVE, 'Set FOLHEIA_E2E_LIVE=1 to hit the real sites');
test.skip(({ browserName }) => browserName !== 'chromium', 'Extensions load only in Chromium');

// Our own server on 127.0.0.1: MangaDex allows localhost origins by CORS,
// and the shared dev server listens on localhost only.
const APP = 'http://127.0.0.1:5175/#/lab';
const IA = 'https://archive.org/download/wonderfulwizardo00baumiala/wonderfulwizardo00baumiala';

let server: ViteDevServer;
let harness: Harness;
let page: Page;

test.beforeAll(async () => {
  test.skip(test.info().project.name !== 'chromium', 'Desktop Chromium only');
  server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true } });
  await server.listen();
  // Probes may hit any site; the default run only the two legitimate ones.
  harness = await launchWithBridge(
    process.env.FOLHEIA_BRIDGE_PROBES
      ? ['https://*/*']
      : ['https://api.mangadex.org/*', 'https://*.archive.org/*'],
  );
  page = await harness.context.newPage();
  await page.goto(APP);
  await expect(page.getByTestId('bridge-status')).toHaveText(/^extension/);
});

test.afterAll(async () => {
  await harness?.close();
  await server?.close();
});

async function fetchFromLab(url: string, route: 'auto' | 'só fetch' | 'só ponte') {
  const panel = page.getByTestId('bridge-panel');
  await panel.getByLabel('URL da ponte').fill(url);
  await panel.getByLabel(route).check();
  await panel.getByRole('button', { name: 'Buscar' }).click();
}

async function report(
  label: string,
  info: { annotations: { type: string; description?: string }[] },
) {
  await expect(page.getByTestId('bridge-result')).toBeVisible({ timeout: 60_000 });
  const text = (await page.getByTestId('bridge-result').innerText()).replace(/\s+/g, ' ');
  info.annotations.push({ type: label, description: text });
  console.log(`[live] ${label}: ${text}`);
}

test('MangaDex API: blocked for the page, read through the bridge', async () => {
  const info = test.info();
  await fetchFromLab('https://api.mangadex.org/manga?limit=1', 'só fetch');
  await expect(page.getByTestId('bridge-error')).toContainText('blocked', { timeout: 30_000 });
  await fetchFromLab('https://api.mangadex.org/manga?limit=1', 'auto');
  await expect(page.getByTestId('bridge-via')).toHaveText('bridge', { timeout: 30_000 });
  await expect(page.getByTestId('bridge-text')).toContainText('"result":"ok"');
  await report('mangadex', info);
});

test('Internet Archive: a cover image and a 17 MB PDF', async () => {
  const info = test.info();
  test.setTimeout(360_000);
  await fetchFromLab(`${IA}_cover_image.jpg`, 'auto');
  await expect(page.getByTestId('bridge-image')).toBeVisible({ timeout: 60_000 });
  await report('archive.org cover', info);
  await fetchFromLab(`${IA}.pdf`, 'só ponte');
  await expect(page.getByTestId('bridge-bytes')).toHaveText(/^\d{7,}$/, { timeout: 300_000 });
  await report('archive.org pdf', info);
});

interface Probe {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

test('probes', async () => {
  const file = process.env.FOLHEIA_BRIDGE_PROBES;
  test.skip(!file, 'Set FOLHEIA_BRIDGE_PROBES=<file.json>');
  const probes = JSON.parse(readFileSync(file ?? '', 'utf8')) as Probe[];
  test.setTimeout(60_000 * probes.length);
  const results = [];
  for (const probe of probes) {
    const result = await page.evaluate(runProbe, probe);
    results.push({ name: probe.name, url: probe.url, ...result });
    console.log(`[probe] ${probe.name}: ${JSON.stringify(result)}`);
    // Be polite: one site at a time, with a pause.
    await page.waitForTimeout(1500);
  }
  if (process.env.FOLHEIA_BRIDGE_PROBES_OUT)
    writeFileSync(process.env.FOLHEIA_BRIDGE_PROBES_OUT, JSON.stringify(results, null, 2));
});

/** Runs in the page: plain fetch, then the bridge, straight over the protocol. */
async function runProbe(probe: Probe) {
  let page: string;
  try {
    const response = await fetch(probe.url, { credentials: 'omit' });
    page = `read ${response.status}`;
  } catch {
    page = 'blocked';
  }
  const id = crypto.randomUUID();
  const started = performance.now();
  const bridge = await new Promise<Record<string, unknown>>((resolve) => {
    let head: { status: number; headers: [string, string][]; url: string } | undefined;
    const chunks: ArrayBuffer[] = [];
    const timer = setTimeout(() => resolve({ error: 'probe timeout' }), 45_000);
    const listener = (event: MessageEvent) => {
      const message = event.data as Record<string, unknown>;
      if (message?.from !== 'bridge' || message.id !== id) return;
      if (message.type === 'head') head = message.head as typeof head;
      if (message.type === 'chunk') chunks.push(message.data as ArrayBuffer);
      if (message.type !== 'end' && message.type !== 'error') return;
      clearTimeout(timer);
      window.removeEventListener('message', listener);
      if (message.type === 'error') return resolve({ error: message.error });
      const bytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const headers = Object.fromEntries(head?.headers ?? []);
      const first = chunks[0] ? new TextDecoder().decode(chunks[0].slice(0, 4096)) : '';
      const challenge =
        headers['cf-mitigated'] === 'challenge' ||
        /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(first);
      resolve({
        status: head?.status,
        finalUrl: head?.url,
        type: headers['content-type'],
        server: headers.server,
        bytes,
        ms: Math.round(performance.now() - started),
        challenge,
        title: /<title>([^<]{0,80})/i.exec(first)?.[1]?.trim(),
      });
    };
    window.addEventListener('message', listener);
    window.postMessage(
      {
        channel: 'folheia-bridge',
        from: 'page',
        type: 'fetch',
        id,
        request: { url: probe.url, method: 'GET', headers: probe.headers ?? {}, timeoutMs: 40_000 },
      },
      location.origin,
    );
  });
  return { page, bridge };
}
