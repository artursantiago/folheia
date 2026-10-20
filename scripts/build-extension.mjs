// Builds the Folheia network bridge (extension/) into:
//   <out>/chrome/                 unpacked MV3 extension for Chrome and Edge
//   <out>/firefox/                MV3 extension for Firefox (desktop and Android)
//   <out>/folheia-bridge.user.js  userscript (Userscripts on Safari, Violentmonkey…)
//
// Usage: node scripts/build-extension.mjs [--dev] [--out <dir>] [--grant <pattern,…>]
//   --dev    also runs on localhost/127.0.0.1 (local development and e2e).
//   --grant  dev only: pre-approves these destinations (automated live tests,
//            which can't click the browser's permission prompt).
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { DEV_MATCHES, FOLHEIA_MATCHES } from '../extension/src/patterns.ts';

const VERSION = '0.1.0';
const args = process.argv.slice(2);
const dev = args.includes('--dev');
const outIndex = args.indexOf('--out');
const out = resolve(outIndex >= 0 ? args[outIndex + 1] : 'extension/dist');
const src = resolve('extension/src');
const grantIndex = args.indexOf('--grant');
const granted = dev && grantIndex >= 0 ? args[grantIndex + 1].split(',') : [];
const matches = [...FOLHEIA_MATCHES, ...(dev ? DEV_MATCHES : [])];

async function bundle(entry, outDir, fileName, banner = '') {
  await build({
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    define: {
      __BRIDGE_VERSION__: JSON.stringify(VERSION),
      __BRIDGE_DEV__: JSON.stringify(dev),
    },
    build: {
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      minify: false,
      target: 'es2022',
      lib: {
        entry: join(src, entry),
        formats: ['iife'],
        name: 'folheiaBridge',
        fileName: () => fileName,
      },
      rolldownOptions: { output: { banner } },
    },
  });
}

function manifest(browser) {
  return {
    manifest_version: 3,
    name: '__MSG_name__',
    description: '__MSG_description__',
    default_locale: 'en',
    version: VERSION,
    permissions: ['declarativeNetRequestWithHostAccess'],
    // Destinations: none granted up front, the user approves each one. The
    // Folheia pages themselves are listed because header rules on the page's
    // own image requests need access to the initiator too. The dev build
    // pre-approves 127.0.0.1, the e2e tests' "foreign site".
    host_permissions: [
      ...new Set([...matches, ...(dev ? ['http://127.0.0.1/*', ...granted] : [])]),
    ],
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    background:
      browser === 'firefox'
        ? { scripts: ['background.js'], persistent: false }
        : { service_worker: 'background.js' },
    content_scripts: [{ matches, js: ['content.js'], run_at: 'document_start', all_frames: false }],
    options_ui: { page: 'options.html', open_in_tab: true },
    action: { default_title: '__MSG_name__' },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'folheia-bridge@artursantiago.github.io',
              strict_min_version: '128.0',
              data_collection_permissions: { required: ['none'] },
            },
            gecko_android: { strict_min_version: '128.0' },
          },
        }
      : { minimum_chrome_version: '121' }),
  };
}

function userscriptHeader() {
  const lines = [
    ['name', 'Folheia Bridge'],
    ['namespace', 'https://github.com/artursantiago/folheia'],
    ['version', VERSION],
    ['description', 'Lets the Folheia reader fetch from approved sites without CORS limits.'],
    ['license', 'MIT'],
    ...matches.map((match) => ['match', match]),
    ['grant', 'GM.xmlHttpRequest'],
    ['grant', 'GM_xmlhttpRequest'],
    ['connect', 'api.mangadex.org'],
    ['connect', 'archive.org'],
    ...(dev ? [['connect', '127.0.0.1']] : []),
    ['run-at', 'document-start'],
    ['inject-into', 'content'],
    ['noframes', ''],
  ];
  const body = lines.map(([key, value]) => `// @${key.padEnd(12)} ${value}`.trimEnd());
  return ['// ==UserScript==', ...body, '// ==/UserScript==', ''].join('\n');
}

await rm(out, { recursive: true, force: true });
for (const browser of ['chrome', 'firefox']) {
  const dir = join(out, browser);
  await mkdir(dir, { recursive: true });
  for (const entry of ['background', 'content', 'options'])
    await bundle(`${entry}.ts`, dir, `${entry}.js`);
  await cp(resolve('extension/static'), dir, { recursive: true });
  await writeFile(join(dir, 'manifest.json'), `${JSON.stringify(manifest(browser), null, 2)}\n`);
}
await bundle('userscript.ts', out, 'folheia-bridge.user.js', userscriptHeader());
console.log(`Bridge ${VERSION}${dev ? ' (dev)' : ''} built in ${out}`);
