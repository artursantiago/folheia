// Shared setup for the bridge e2e tests: builds the dev extension and opens
// Chromium with it loaded unpacked.
import { chromium, type BrowserContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Harness {
  context: BrowserContext;
  close(): Promise<void>;
}

/** `grant`: destinations pre-approved in the build (tests can't click prompts). */
export async function launchWithBridge(grant: string[] = []): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), 'folheia-bridge-'));
  const build = join(dir, 'build');
  const args = ['scripts/build-extension.mjs', '--dev', '--out', build];
  if (grant.length) args.push('--grant', grant.join(','));
  execFileSync('node', args);
  const extension = join(build, 'chrome');
  const context = await chromium.launchPersistentContext(join(dir, 'profile'), {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  return {
    context,
    async close() {
      await context.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
