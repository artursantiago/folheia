// Extension background (service worker in Chrome, event page in Firefox).
// Its fetch is exempt from CORS for hosts the user granted, which is the
// whole point of the bridge. Referer and User-Agent can't be set on a fetch,
// so they go through a declarativeNetRequest session rule scoped to that one
// URL and to requests outside tabs (the extension's own).
import { patternForUrl, toPermissionPattern } from './patterns';
import {
  FORBIDDEN_FETCH_HEADERS,
  LIMITS,
  PROTOCOL_VERSION,
  isFolheiaPage,
  validateRequest,
  type BridgeError,
  type BridgeInfo,
  type BridgeRequest,
} from './protocol';
import { api, engine } from './webext';
import { PORT_NAME, toBase64, type FromBackground, type ToBackground } from './wire';

const info: BridgeInfo = {
  protocol: PROTOCOL_VERSION,
  kind: 'extension',
  version: __BRIDGE_VERSION__,
  host: engine,
};

/** Firefox messaging is structured clone, so bytes need no base64. */
const cloneable = engine === 'firefox';

// Session rules outlive a service-worker restart; start from a clean slate.
let nextRuleId = 1;
const rulesReady = (async () => {
  const dnr = api.declarativeNetRequest;
  if (!dnr) return;
  const stale = await dnr.getSessionRules();
  if (stale.length) await dnr.updateSessionRules({ removeRuleIds: stale.map((rule) => rule.id) });
})();

api.action?.onClicked.addListener(() => void api.runtime.openOptionsPage());

api.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;
  // Only the top frame of a Folheia page; anything else is hung up on.
  const url = port.sender?.url;
  if (!url || !isFolheiaPage(url) || port.sender?.frameId !== 0) {
    port.disconnect();
    return;
  }

  const inFlight = new Map<string, AbortController>();
  const send = (message: FromBackground) => {
    try {
      port.postMessage(message);
    } catch {
      // The page went away; onDisconnect aborts the rest.
    }
  };
  port.onDisconnect.addListener(() => {
    for (const controller of inFlight.values()) controller.abort();
    inFlight.clear();
  });

  port.onMessage.addListener((raw) => {
    const message = raw as ToBackground;
    switch (message.type) {
      case 'hello':
        send({ type: 'hello', id: message.id, info });
        break;
      case 'abort':
        inFlight.get(message.id)?.abort();
        break;
      case 'request-access':
        void showApproval(message.origins).then((shown) =>
          send({ type: 'access', id: message.id, shown }),
        );
        break;
      case 'fetch':
        void run(message.id, message.request, inFlight, send);
        break;
    }
  });
});

async function showApproval(origins: unknown): Promise<boolean> {
  if (!Array.isArray(origins)) return false;
  const patterns = origins
    .map((origin) => (typeof origin === 'string' ? toPermissionPattern(origin) : undefined))
    .filter((pattern): pattern is string => Boolean(pattern));
  if (!patterns.length) return false;
  // Permission prompts need a user gesture inside the extension, so the page
  // can only open our screen; the user decides there.
  const query = new URLSearchParams({ request: patterns.join(' ') });
  await api.tabs.create({ url: api.runtime.getURL(`options.html?${query}`) });
  return true;
}

async function isAllowed(url: string) {
  return api.permissions.contains({ origins: [patternForUrl(url)] });
}

async function run(
  id: string,
  request: BridgeRequest,
  inFlight: Map<string, AbortController>,
  send: (message: FromBackground) => void,
) {
  const fail = (error: BridgeError) => send({ type: 'error', id, error });
  const invalid = validateRequest(request);
  if (invalid) return fail(invalid);
  if (inFlight.has(id)) return fail({ code: 'bad-request', message: 'Duplicate request id' });
  if (inFlight.size >= LIMITS.maxConcurrent)
    return fail({ code: 'busy', message: 'Too many requests in flight' });
  if (!(await isAllowed(request.url))) {
    const origin = new URL(request.url).origin;
    return fail({ code: 'not-allowed', message: `Not approved: ${origin}`, origin });
  }

  const controller = new AbortController();
  inFlight.set(id, controller);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, request.timeoutMs ?? LIMITS.defaultTimeoutMs);
  const started = performance.now();
  let ruleId: number | undefined;

  try {
    ruleId = await addHeaderRule(request);
    const headers = Object.entries(request.headers).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && !FORBIDDEN_FETCH_HEADERS.includes(entry[0] as never),
    );
    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.body ?? null,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    // A redirect may land somewhere the user never approved.
    if (response.url && !(await isAllowed(response.url))) {
      controller.abort();
      const origin = new URL(response.url).origin;
      return fail({ code: 'not-allowed', message: `Redirected to ${origin}`, origin });
    }
    const headersMs = Math.round(performance.now() - started);
    const length = Number(response.headers.get('content-length'));
    if (length > LIMITS.maxResponseBytes) {
      controller.abort();
      return fail({ code: 'too-large', message: `Response is ${length} bytes` });
    }
    send({
      type: 'head',
      id,
      head: {
        status: response.status,
        statusText: response.statusText,
        url: response.url || request.url,
        headers: [...response.headers],
      },
    });
    if (!(await streamBody(id, response, send))) {
      controller.abort();
      return fail({ code: 'too-large', message: 'Response too large' });
    }
    send({
      type: 'end',
      id,
      timing: { headersMs, totalMs: Math.round(performance.now() - started) },
    });
  } catch (error) {
    if (controller.signal.aborted)
      fail(
        timedOut
          ? { code: 'timeout', message: 'The request timed out' }
          : { code: 'aborted', message: 'Aborted' },
      );
    else fail({ code: 'network', message: error instanceof Error ? error.message : String(error) });
  } finally {
    clearTimeout(timer);
    inFlight.delete(id);
    if (ruleId !== undefined)
      await api.declarativeNetRequest?.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}

/** Sends the body in chunks; false when it outgrows the limit. */
async function streamBody(
  id: string,
  response: Response,
  send: (message: FromBackground) => void,
): Promise<boolean> {
  if (!response.body) return true;
  const reader = response.body.getReader();
  const buffer = new Uint8Array(LIMITS.chunkBytes);
  let filled = 0;
  let total = 0;
  const flush = () => {
    if (!filled) return;
    const bytes = buffer.subarray(0, filled);
    send(
      cloneable
        ? { type: 'chunk', id, data: bytes.slice().buffer }
        : { type: 'chunk', id, base64: toBase64(bytes) },
    );
    filled = 0;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITS.maxResponseBytes) return false;
    let offset = 0;
    while (offset < value.byteLength) {
      const take = Math.min(value.byteLength - offset, buffer.length - filled);
      buffer.set(value.subarray(offset, offset + take), filled);
      filled += take;
      offset += take;
      if (filled === buffer.length) flush();
    }
  }
  flush();
  return true;
}

async function addHeaderRule(request: BridgeRequest): Promise<number | undefined> {
  const names = FORBIDDEN_FETCH_HEADERS.filter((name) => request.headers[name] !== undefined);
  if (!names.length) return undefined;
  const dnr = api.declarativeNetRequest;
  if (!dnr) throw new Error('This browser cannot set Referer or User-Agent');
  await rulesReady;
  const id = nextRuleId++;
  await dnr.updateSessionRules({
    addRules: [
      {
        id,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: names.map((header) => ({
            header,
            operation: 'set',
            value: request.headers[header] ?? '',
          })),
        },
        // Only this URL, and only requests that don't come from a tab.
        condition: { urlFilter: `|${request.url}|`, tabIds: [-1] },
      },
    ],
  });
  return id;
}
