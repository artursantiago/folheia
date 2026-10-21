// Folheia network bridge: the message protocol shared by the site, the
// extension (content script + background) and the userscript.
//
// The site talks to the bridge with window.postMessage on its own window.
// The bridge answers only Folheia pages, only for destinations the user
// approved, never sends cookies, and streams the body back in chunks.
//
// Pure TypeScript with no browser-extension or DOM-specific APIs, so every
// side can import it. It lives here, in the app, so src/ never imports from
// extension/; the extension (on its own branch for now) imports it from here.

export const CHANNEL = 'folheia-bridge';
export const PROTOCOL_VERSION = 1;

/** Limits every bridge enforces, whatever the page asks for. */
export const LIMITS = {
  /** Request bodies are small (search forms, GraphQL); books come as responses. */
  maxBodyBytes: 1 << 20,
  maxResponseBytes: 200 << 20,
  defaultTimeoutMs: 30_000,
  maxTimeoutMs: 300_000,
  /** Raw bytes per chunk sent back to the page. */
  chunkBytes: 1 << 20,
  /** Requests in flight per page. */
  maxConcurrent: 8,
} as const;

/**
 * Request headers a page may set. Referer and User-Agent are the reason the
 * bridge exists (browsers forbid pages from setting them). Cookie,
 * Authorization and Origin are left out on purpose: the bridge never acts with
 * the user's identity on other sites.
 */
export const ALLOWED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'content-type',
  'if-modified-since',
  'if-none-match',
  'range',
  'referer',
  'user-agent',
  'x-requested-with',
] as const;

export type AllowedHeader = (typeof ALLOWED_REQUEST_HEADERS)[number];

/** Headers a fetch() cannot set, even from an extension: they need other means. */
export const FORBIDDEN_FETCH_HEADERS: readonly AllowedHeader[] = ['referer', 'user-agent'];

export type BridgeMethod = 'GET' | 'HEAD' | 'POST';

export interface BridgeRequest {
  url: string;
  method: BridgeMethod;
  /** Lower-case names from ALLOWED_REQUEST_HEADERS. */
  headers: Partial<Record<AllowedHeader, string>>;
  body?: string | undefined;
  timeoutMs?: number | undefined;
}

export interface BridgeInfo {
  /** Bumped on breaking changes; the page refuses a different major. */
  protocol: number;
  kind: 'extension' | 'userscript';
  version: string;
  /** Where it runs: "chrome", "firefox", "Userscripts", "Tampermonkey"… */
  host: string;
}

export interface ResponseHead {
  status: number;
  statusText: string;
  /** Final URL, after redirects. */
  url: string;
  headers: [string, string][];
}

export interface Timing {
  /** From the bridge receiving the request to the response headers. */
  headersMs: number;
  /** From the bridge receiving the request to the last byte. */
  totalMs: number;
}

export type BridgeErrorCode =
  | 'not-allowed'
  | 'bad-request'
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'too-large'
  | 'busy'
  | 'unsupported';

export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
  /** For "not-allowed": the origin the user has to approve. */
  origin?: string;
}

/**
 * A Referer for the images the page itself loads (`<img src>`) from one
 * host: hotlink-protected CDNs refuse the page's own Referer. Lets the page
 * show covers without moving their bytes through the bridge.
 */
export interface ImageHeaderRule {
  /** Exact host the images come from ("webtoon-phinf.pstatic.net"). */
  host: string;
  referer: string;
}

export interface ImageHeaderResult {
  applied: string[];
  refused: { host: string; code: BridgeErrorCode }[];
}

/** Page → bridge. */
export type PageMessage =
  | { type: 'hello'; id: string; protocol: number }
  | { type: 'fetch'; id: string; request: BridgeRequest }
  | { type: 'abort'; id: string }
  /** Asks the bridge to show its own approval screen for these origins. */
  | { type: 'request-access'; id: string; origins: string[] }
  | { type: 'image-headers'; id: string; rules: ImageHeaderRule[] };

/** Bridge → page. */
export type BridgeMessage =
  /** Sent unprompted when the bridge loads, for pages that said hello too early. */
  | { type: 'ready'; info: BridgeInfo }
  | { type: 'hello'; id: string; info: BridgeInfo }
  | { type: 'head'; id: string; head: ResponseHead }
  | { type: 'chunk'; id: string; data: ArrayBuffer }
  | { type: 'end'; id: string; timing: Timing }
  | { type: 'error'; id: string; error: BridgeError }
  | { type: 'access'; id: string; shown: boolean }
  | { type: 'image-headers'; id: string; result: ImageHeaderResult };

export type Envelope<T> = T & { channel: typeof CHANNEL; from: 'page' | 'bridge' };

export function wrap<T extends PageMessage | BridgeMessage>(
  from: 'page' | 'bridge',
  message: T,
): Envelope<T> {
  return { ...message, channel: CHANNEL, from };
}

function isEnvelope(data: unknown, from: 'page' | 'bridge'): data is Envelope<{ type: string }> {
  if (typeof data !== 'object' || data === null) return false;
  const value = data as Record<string, unknown>;
  return value.channel === CHANNEL && value.from === from && typeof value.type === 'string';
}

export function isPageMessage(data: unknown): data is Envelope<PageMessage> {
  return isEnvelope(data, 'page');
}

export function isBridgeMessage(data: unknown): data is Envelope<BridgeMessage> {
  return isEnvelope(data, 'bridge');
}

/**
 * The pages the bridge serves: the published site (whatever the base path
 * under /folheia/) and local development. Another deployment means adding
 * it here and to the extension's content-script matches.
 */
export function isFolheiaPage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:' && parsed.hostname === 'folheia-app.github.io')
    return parsed.pathname.startsWith('/folheia/');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  return local && (parsed.protocol === 'http:' || parsed.protocol === 'https:');
}

/** The origin of an http(s) URL, or undefined for anything else. */
export function httpOrigin(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : undefined;
  } catch {
    return undefined;
  }
}

/** Checks a request against the limits; returns the reason when it's refused. */
export function validateRequest(request: unknown): BridgeError | undefined {
  const bad = (message: string): BridgeError => ({ code: 'bad-request', message });
  if (typeof request !== 'object' || request === null) return bad('Missing request');
  const { url, method, headers, body, timeoutMs } = request as Record<string, unknown>;
  if (typeof url !== 'string' || !httpOrigin(url)) return bad('Only http(s) URLs');
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST')
    return bad('Only GET, HEAD and POST');
  if (typeof headers !== 'object' || headers === null) return bad('Missing headers');
  for (const [name, value] of Object.entries(headers)) {
    if (!(ALLOWED_REQUEST_HEADERS as readonly string[]).includes(name))
      return bad(`Header not allowed: ${name}`);
    if (typeof value !== 'string') return bad(`Header ${name} must be a string`);
  }
  if (body !== undefined) {
    if (method !== 'POST') return bad('Only POST has a body');
    if (typeof body !== 'string') return bad('The body must be a string');
    if (body.length > LIMITS.maxBodyBytes) return { code: 'too-large', message: 'Body too large' };
  }
  if (
    timeoutMs !== undefined &&
    (typeof timeoutMs !== 'number' || timeoutMs <= 0 || timeoutMs > LIMITS.maxTimeoutMs)
  )
    return bad(`Timeout must be between 1 and ${LIMITS.maxTimeoutMs} ms`);
  return undefined;
}

/** A plain hostname: letters, digits, dots and dashes, no wildcard, no port. */
export function isHostname(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= 253 && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value)
  );
}
