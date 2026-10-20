// Userscript variant of the bridge, for Safari (the free "Userscripts" app),
// Violentmonkey and Tampermonkey. The manager's GM.xmlHttpRequest runs in its
// extension, outside the page's CORS. The header block is added by
// scripts/build-extension.mjs.
//
// Allowlist: the manager asks or checks @connect where it supports it; the
// script also keeps its own list, which you edit below.
import {
  LIMITS,
  PROTOCOL_VERSION,
  isFolheiaPage,
  isPageMessage,
  validateRequest,
  wrap,
  type BridgeError,
  type BridgeInfo,
  type BridgeMessage,
  type BridgeRequest,
} from './protocol';

/** Hosts the bridge may reach. "*.example.org" covers subdomains and example.org. */
const ALLOWED_HOSTS = ['api.mangadex.org', '*.archive.org'];
if (__BRIDGE_DEV__) ALLOWED_HOSTS.push('127.0.0.1');

interface GmResponse {
  status: number;
  statusText: string;
  /** Tampermonkey, Violentmonkey. */
  finalUrl?: string;
  /** Userscripts (Safari). */
  responseURL?: string;
  responseHeaders: string;
  response: unknown;
  readyState?: number;
}

interface GmDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: string | undefined;
  responseType: 'arraybuffer';
  timeout: number;
  anonymous: boolean;
  onreadystatechange?: (response: GmResponse) => void;
  onload: (response: GmResponse) => void;
  onerror: (response: unknown) => void;
  ontimeout: () => void;
  onabort: () => void;
}

/** GM.xmlHttpRequest returns a promise with abort() (Userscripts) or a plain handle. */
type GmHandle = { abort?: () => void; then?: (ok: unknown, fail: () => void) => unknown };
type GmRequest = (details: GmDetails) => GmHandle | undefined;

declare const GM: { xmlHttpRequest?: GmRequest; info?: GmInfo } | undefined;
declare const GM_xmlhttpRequest: GmRequest | undefined;
declare const GM_info: GmInfo | undefined;
interface GmInfo {
  scriptHandler?: string;
}

const gmRequest: GmRequest | undefined =
  (typeof GM !== 'undefined' ? GM.xmlHttpRequest : undefined) ??
  (typeof GM_xmlhttpRequest !== 'undefined' ? GM_xmlhttpRequest : undefined);
const gmInfo =
  (typeof GM !== 'undefined' ? GM.info : undefined) ??
  (typeof GM_info !== 'undefined' ? GM_info : undefined);

const info: BridgeInfo = {
  protocol: PROTOCOL_VERSION,
  kind: 'userscript',
  version: __BRIDGE_VERSION__,
  host: gmInfo?.scriptHandler ?? 'unknown',
};

function hostAllowed(url: string) {
  const { hostname } = new URL(url);
  return ALLOWED_HOSTS.some((allowed) =>
    allowed.startsWith('*.')
      ? hostname === allowed.slice(2) || hostname.endsWith(allowed.slice(1))
      : hostname === allowed,
  );
}

function post(message: BridgeMessage, transfer: Transferable[] = []) {
  window.postMessage(wrap('bridge', message), location.origin, transfer);
}

function parseHeaders(raw: string): [string, string][] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.match(/^([^:]+):\s*(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => [(match[1] ?? '').trim().toLowerCase(), (match[2] ?? '').trim()]);
}

async function toArrayBuffer(body: unknown): Promise<ArrayBuffer> {
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body))
    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  if (body instanceof Blob) return body.arrayBuffer();
  if (typeof body === 'string') return new TextEncoder().encode(body).buffer as ArrayBuffer;
  if (Array.isArray(body)) return new Uint8Array(body as number[]).buffer;
  // Some managers hand back objects from another realm: duck-type them.
  const maybe = body as { byteLength?: number } | null;
  if (maybe && typeof maybe.byteLength === 'number')
    return new Uint8Array(body as ArrayBuffer).slice().buffer as ArrayBuffer;
  return new ArrayBuffer(0);
}

const inFlight = new Map<string, () => void>();

function run(id: string, request: BridgeRequest) {
  const fail = (error: BridgeError) => {
    inFlight.delete(id);
    post({ type: 'error', id, error });
  };
  const invalid = validateRequest(request);
  if (invalid) return fail(invalid);
  if (!gmRequest) return fail({ code: 'unsupported', message: 'GM.xmlHttpRequest is missing' });
  if (inFlight.has(id)) return fail({ code: 'bad-request', message: 'Duplicate request id' });
  if (inFlight.size >= LIMITS.maxConcurrent)
    return fail({ code: 'busy', message: 'Too many requests in flight' });
  if (!hostAllowed(request.url)) {
    const origin = new URL(request.url).origin;
    return fail({ code: 'not-allowed', message: `Not in ALLOWED_HOSTS: ${origin}`, origin });
  }

  const started = performance.now();
  let headersMs: number | undefined;
  const headers = Object.fromEntries(
    Object.entries(request.headers).filter((entry): entry is [string, string] => !!entry[1]),
  );
  const handle = gmRequest({
    method: request.method,
    url: request.url,
    headers,
    data: request.body,
    responseType: 'arraybuffer',
    timeout: request.timeoutMs ?? LIMITS.defaultTimeoutMs,
    // No cookies (Violentmonkey/Tampermonkey; other managers may ignore it).
    anonymous: true,
    onreadystatechange: (response) => {
      if (response.readyState === 2) headersMs ??= Math.round(performance.now() - started);
    },
    onload: (response) => {
      if (!inFlight.has(id)) return;
      const finalUrl = response.finalUrl || response.responseURL || request.url;
      if (!hostAllowed(finalUrl)) {
        const origin = new URL(finalUrl).origin;
        return fail({ code: 'not-allowed', message: `Redirected to ${origin}`, origin });
      }
      void toArrayBuffer(response.response).then((data) => {
        if (!inFlight.has(id)) return;
        inFlight.delete(id);
        if (data.byteLength > LIMITS.maxResponseBytes)
          return post({ type: 'error', id, error: { code: 'too-large', message: 'Too large' } });
        const totalMs = Math.round(performance.now() - started);
        post({
          type: 'head',
          id,
          head: {
            status: response.status,
            statusText: response.statusText,
            url: finalUrl,
            headers: parseHeaders(response.responseHeaders ?? ''),
          },
        });
        if (data.byteLength) post({ type: 'chunk', id, data }, [data]);
        post({ type: 'end', id, timing: { headersMs: headersMs ?? totalMs, totalMs } });
      });
    },
    onerror: () => inFlight.has(id) && fail({ code: 'network', message: 'The request failed' }),
    ontimeout: () =>
      inFlight.has(id) && fail({ code: 'timeout', message: 'The request timed out' }),
    onabort: () => inFlight.has(id) && fail({ code: 'aborted', message: 'Aborted' }),
  });
  // The handlers report failures; a rejected promise would only be noise.
  handle?.then?.(undefined, () => undefined);
  inFlight.set(id, () => handle?.abort?.());
}

if (isFolheiaPage(location.href)) {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (!isPageMessage(event.data)) return;
    const message = event.data;
    switch (message.type) {
      case 'hello':
        post({ type: 'hello', id: message.id, info });
        break;
      case 'fetch':
        run(message.id, message.request);
        break;
      case 'abort': {
        const abort = inFlight.get(message.id);
        if (abort) {
          abort();
          // Not every manager calls onabort.
          if (inFlight.delete(message.id))
            post({ type: 'error', id: message.id, error: { code: 'aborted', message: 'Aborted' } });
        }
        break;
      }
      case 'request-access':
        // No approval screen here: the user edits ALLOWED_HOSTS.
        post({ type: 'access', id: message.id, shown: false });
        break;
      case 'image-headers':
        // GM APIs can't touch the page's own requests.
        post({
          type: 'image-headers',
          id: message.id,
          result: {
            applied: [],
            refused: message.rules.map(({ host }) => ({ host, code: 'unsupported' as const })),
          },
        });
        break;
    }
  });
  post({ type: 'ready', info });
}
