// "Fetch" as a platform seam: plain fetch on the web now, native HTTP
// (CapacitorHttp) in the app later. The bridge (extension/userscript) is an
// optional add-on for catalog sources, never used unless a Network is built
// with it: the user's ?file= URL goes through plain fetch only (D5, rule 2).
import {
  BridgeError,
  type BridgeClient,
  type BridgeInfo,
  type ImageHeaderResult,
  type ImageHeaderRule,
} from './bridge/client';
import type { BridgeErrorCode } from './bridge/protocol';

export type HttpMethod = 'GET' | 'HEAD' | 'POST';

export interface NetworkRequest {
  url: string;
  method?: HttpMethod;
  /** Lower-case names. */
  headers?: Record<string, string>;
  body?: string;
  /** Only the bytes [begin, end), as a Range request that skips the HTTP cache. */
  range?: { begin: number; end: number };
  timeoutMs?: number;
  signal?: AbortSignal;
  /** With a bridge: "auto" (default) tries fetch first and the bridge when CORS blocks it. */
  route?: 'auto' | 'fetch' | 'bridge';
  onProgress?: (received: number) => void;
}

export interface NetworkResponse {
  via: 'fetch' | 'bridge';
  status: number;
  statusText: string;
  ok: boolean;
  /** Final URL, after redirects. */
  url: string;
  headers: Headers;
  body: ArrayBuffer;
}

export type NetworkErrorCode =
  | BridgeErrorCode
  /** Fetch failed and no bridge helped: usually CORS, sometimes the network. */
  | 'blocked'
  /** Referer/User-Agent asked for, and no bridge to set them. */
  | 'bridge-required';

export class NetworkError extends Error {
  override readonly name = 'NetworkError';
  constructor(
    readonly code: NetworkErrorCode,
    message: string,
    readonly origin?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** What only the bridge can do. Present on a Network built with one. */
export interface NetworkBridge {
  /** The installed bridge, if any (detected once, then cached). */
  info(): Promise<BridgeInfo | undefined>;
  /** Asks the bridge to show its approval screen for these origins. */
  requestAccess(origins: string[]): Promise<boolean>;
  /**
   * A Referer for the page's own `<img>` requests to these hosts, so covers
   * from hotlink-protected CDNs can be shown without reading their bytes.
   */
  imageHeaders(rules: ImageHeaderRule[]): Promise<ImageHeaderResult>;
}

export interface Network {
  request(request: NetworkRequest): Promise<NetworkResponse>;
  readonly bridge?: NetworkBridge;
}

/** Headers a page's fetch() may not set. */
const PAGE_FORBIDDEN_HEADERS = ['referer', 'user-agent'];

/** Total size from a 206 response's Content-Range ("bytes 0-99/1234"). */
export function rangeTotal(response: NetworkResponse): number | undefined {
  if (response.status !== 206) return undefined;
  const total = Number(response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1]);
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

function headersOf(request: NetworkRequest): Record<string, string> {
  const headers = { ...request.headers };
  if (request.range) headers.range = `bytes=${request.range.begin}-${request.range.end - 1}`;
  return headers;
}

function signalOf(request: NetworkRequest) {
  const signals = [
    request.signal,
    request.timeoutMs ? AbortSignal.timeout(request.timeoutMs) : undefined,
  ];
  const present = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  return present.length > 1 ? AbortSignal.any(present) : present[0];
}

function toHeaders(entries: [string, string][]) {
  const headers = new Headers();
  for (const [name, value] of entries) {
    try {
      headers.append(name, value);
    } catch {
      // A header the browser won't hold: not worth failing the response for.
    }
  }
  return headers;
}

export function createWebNetwork(options: { bridge?: BridgeClient } = {}): Network {
  const client = options.bridge;
  let detected: Promise<BridgeInfo | undefined> | undefined;
  /** Origins where fetch failed and the bridge worked: skip straight to it. */
  const needsBridge = new Set<string>();

  const info = async () => {
    if (!client) return undefined;
    detected ??= client.detect();
    const found = await detected;
    // Don't cache "absent" for good: a userscript may load late.
    if (!found) detected = undefined;
    return found;
  };

  async function viaFetch(request: NetworkRequest): Promise<NetworkResponse> {
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: headersOf(request),
      body: request.body ?? null,
      credentials: 'omit',
      // The HTTP cache can answer a range with the wrong (whole) body.
      ...(request.range && { cache: 'no-store' as const }),
      signal: signalOf(request) ?? null,
    });
    const body = await response.arrayBuffer();
    request.onProgress?.(body.byteLength);
    return {
      via: 'fetch',
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url || request.url,
      headers: response.headers,
      body,
    };
  }

  async function viaBridge(
    bridge: BridgeClient,
    request: NetworkRequest,
  ): Promise<NetworkResponse> {
    try {
      const { head, body } = await bridge.fetch(
        {
          url: request.url,
          method: request.method ?? 'GET',
          headers: headersOf(request),
          body: request.body,
          timeoutMs: request.timeoutMs,
        },
        { signal: request.signal, onProgress: request.onProgress },
      );
      return {
        via: 'bridge',
        status: head.status,
        statusText: head.statusText,
        ok: head.status >= 200 && head.status < 300,
        url: head.url,
        headers: toHeaders(head.headers),
        body,
      };
    } catch (error) {
      if (error instanceof BridgeError)
        throw new NetworkError(error.code, error.message, error.origin, { cause: error });
      throw error;
    }
  }

  async function request(request: NetworkRequest): Promise<NetworkResponse> {
    const route = request.route ?? 'auto';
    const origin = new URL(request.url, location.href).origin;
    const forbidden = PAGE_FORBIDDEN_HEADERS.some((name) => request.headers?.[name] !== undefined);

    if (route === 'bridge' || forbidden) {
      if (route === 'fetch')
        throw new NetworkError('bridge-required', 'Referer and User-Agent need the bridge');
      if (!client || !(await info()))
        throw new NetworkError(
          forbidden ? 'bridge-required' : 'unsupported',
          'No bridge installed',
          origin,
        );
      return viaBridge(client, request);
    }
    if (client && route === 'auto' && needsBridge.has(origin) && (await info()))
      return viaBridge(client, request);

    try {
      return await viaFetch(request);
    } catch (error) {
      if (request.signal?.aborted) throw new NetworkError('aborted', 'Aborted', origin);
      if (error instanceof DOMException && error.name === 'TimeoutError')
        throw new NetworkError('timeout', 'The site took too long', origin, { cause: error });
      // A TypeError is all a page learns about CORS (or a dead network).
      if (client && route === 'auto' && error instanceof TypeError && (await info())) {
        const response = await viaBridge(client, request);
        needsBridge.add(origin);
        return response;
      }
      throw new NetworkError('blocked', 'The site does not allow reading it from here', origin, {
        cause: error,
      });
    }
  }

  return client
    ? {
        request,
        bridge: {
          info,
          requestAccess: (origins) => client.requestAccess(origins),
          imageHeaders: (rules) => client.imageHeaders(rules),
        },
      }
    : { request };
}

/** Plain fetch, no bridge: what opening a book by URL uses. */
export const webNetwork = createWebNetwork();

/**
 * Serves files from memory, for tests: GET and HEAD, honoring ranges unless
 * `ranges` is false (like servers that always send the whole file).
 */
export function memoryNetwork(
  files: Record<string, Uint8Array>,
  options: { ranges?: boolean } = {},
): Network & { requests: NetworkRequest[] } {
  const requests: NetworkRequest[] = [];
  const respond = (status: number, body: Uint8Array, headers: Record<string, string> = {}) => ({
    via: 'fetch' as const,
    status,
    statusText: '',
    ok: status >= 200 && status < 300,
    url: '',
    headers: new Headers(headers),
    body: body.slice().buffer as ArrayBuffer,
  });
  return {
    requests,
    async request(request) {
      requests.push(request);
      const file = files[request.url];
      if (!file) return { ...respond(404, new Uint8Array()), url: request.url };
      const { range } = request;
      if (!range || options.ranges === false)
        return {
          ...respond(200, file, { 'content-length': String(file.length) }),
          url: request.url,
        };
      const end = Math.min(range.end, file.length);
      return {
        ...respond(206, file.slice(range.begin, end), {
          'content-range': `bytes ${range.begin}-${end - 1}/${file.length}`,
        }),
        url: request.url,
      };
    },
  };
}
