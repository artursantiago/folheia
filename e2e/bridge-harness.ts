// Shared setup for the bridge e2e tests: builds the dev extension and opens
// a browser with it loaded. Chromium loads it unpacked from the command line;
// Firefox gets it as a temporary add-on over its remote debugging protocol
// (the way Mozilla's web-ext tool installs one), since Playwright can't.
import { chromium, firefox, type BrowserContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Harness {
  context: BrowserContext;
  close(): Promise<void>;
}

function buildBridge(grant: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'folheia-bridge-'));
  const build = join(dir, 'build');
  const args = ['scripts/build-extension.mjs', '--dev', '--out', build];
  if (grant.length) args.push('--grant', grant.join(','));
  execFileSync('node', args);
  return { dir, build };
}

/** `grant`: destinations pre-approved in the build (tests can't click prompts). */
export async function launchWithBridge(
  grant: string[] = [],
  browser: 'chromium' | 'firefox' = 'chromium',
): Promise<Harness> {
  const { dir, build } = buildBridge(grant);
  const context =
    browser === 'firefox'
      ? await launchFirefox(join(build, 'firefox'))
      : await chromium.launchPersistentContext(join(dir, 'profile'), {
          channel: 'chromium',
          args: [
            `--disable-extensions-except=${join(build, 'chrome')}`,
            `--load-extension=${join(build, 'chrome')}`,
          ],
        });
  return {
    context,
    async close() {
      await context.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

const RDP_PORT = 6123;

async function launchFirefox(extension: string): Promise<BrowserContext> {
  const browser = await firefox.launch({
    args: ['-start-debugger-server', String(RDP_PORT)],
    firefoxUserPrefs: {
      'devtools.debugger.remote-enabled': true,
      'devtools.debugger.prompt-connection': false,
      'devtools.chrome.enabled': true,
      'xpinstall.signatures.required': false,
    },
  });
  await installTemporaryAddon(extension);
  const context = await browser.newContext();
  // Closing the context alone would leave the browser running.
  const close = context.close.bind(context);
  context.close = async (...args) => {
    await close(...args);
    await browser.close();
  };
  return context;
}

/** Minimal client for Firefox's remote debugging protocol: "length:json" packets. */
async function installTemporaryAddon(addonPath: string) {
  const socket = await new Promise<ReturnType<typeof connect>>((resolve, reject) => {
    let tries = 0;
    const attempt = () => {
      const s = connect(RDP_PORT, '127.0.0.1');
      s.once('connect', () => resolve(s));
      s.once('error', () => (++tries < 50 ? setTimeout(attempt, 200) : reject(new Error('RDP'))));
    };
    attempt();
  });
  let buffer = Buffer.alloc(0);
  const waiting: ((packet: Record<string, unknown>) => void)[] = [];
  socket.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const colon = buffer.indexOf(':');
      if (colon < 0) break;
      const length = Number(buffer.subarray(0, colon).toString());
      if (buffer.length < colon + 1 + length) break;
      const packet = JSON.parse(buffer.subarray(colon + 1, colon + 1 + length).toString());
      buffer = buffer.subarray(colon + 1 + length);
      waiting.shift()?.(packet);
    }
  });
  const next = () => new Promise<Record<string, unknown>>((resolve) => waiting.push(resolve));
  const send = (packet: object) => {
    const json = Buffer.from(JSON.stringify(packet));
    socket.write(`${json.length}:`);
    socket.write(json);
    return next();
  };
  await next(); // the root actor's greeting
  const root = await send({ to: 'root', type: 'getRoot' });
  const installed = await send({ to: root.addonsActor, type: 'installTemporaryAddon', addonPath });
  socket.end();
  if (!installed.addon) throw new Error(`Firefox refused the add-on: ${JSON.stringify(installed)}`);
}
