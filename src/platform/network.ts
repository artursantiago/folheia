// Network for catalog sources: plain fetch when the site allows it (CORS),
// the bridge (extension/userscript) when it doesn't or when the request needs
// headers a page can't set (Referer, User-Agent). The native app will get its
// own implementation (native HTTP) behind the same interface.
import {
  BridgeError,
  createBridgeClient,
  type BridgeClient,
  type BridgeInfo,
  type ImageHeaderResult,
  type ImageHeaderRule,
} from './bridge';
import { FORBIDDEN_FETCH_HEADERS, type BridgeRequest } from '../../extension/src/protocol';

export type NetworkRoute = 'auto' | 'fetch' | 'bridge';

export interface NetworkRequest {
  url: string;
  method?: BridgeRequest['method'];
  headers?: BridgeRequest['headers'];
  body?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** "auto" (default): fetch first, the bridge when CORS blocks it. */
  route?: NetworkRoute;
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
  /** headersMs/totalMs as measured where the request ran; pageMs end to end, on the page. */
  timing: { headersMs: number; totalMs: number; pageMs: number };
}

export type NetworkErrorCode =
  | BridgeError['code']
  /** Fetch failed and there is no bridge: usually CORS, sometimes the network. */
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

export interface Network {
  request(request: NetworkRequest): Promise<NetworkResponse>;
  /** The installed bridge, if any (detected once, then cached). */
  bridge(): Promise<BridgeInfo | undefined>;
  /** Asks the bridge to show its approval screen for these origins. */
  requestAccess(origins: string[]): Promise<boolean>;
  /**
   * A Referer for the page's own `<img>` requests to these hosts, so covers
   * from hotlink-protected CDNs can be shown without reading their bytes.
   */
  imageHeaders(rules: ImageHeaderRule[]): Promise<ImageHeaderResult>;
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

export function createWebNetwork(client: BridgeClient = createBridgeClient()): Network {
  let detected: Promise<BridgeInfo | undefined> | undefined;
  /** Origins where fetch failed and the bridge worked: skip straight to it. */
  const needsBridge = new Set<string>();

  const bridge = () => {
    detected ??= client.detect();
    return detected.then((info) => {
      // Don't cache "absent" for good: a userscript may load late.
      if (!info) detected = undefined;
      return info;
    });
  };

  async function viaFetch(request: NetworkRequest): Promise<NetworkResponse> {
    const started = performance.now();
    const headers = Object.entries(request.headers ?? {}).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    );
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers,
      body: request.body ?? null,
      credentials: 'omit',
      signal: request.signal ?? null,
    });
    const headersMs = Math.round(performance.now() - started);
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
      timing: {
        headersMs,
        totalMs: Math.round(performance.now() - started),
        pageMs: Math.round(performance.now() - started),
      },
    };
  }

  async function viaBridge(request: NetworkRequest): Promise<NetworkResponse> {
    const started = performance.now();
    try {
      const { head, body, timing } = await client.fetch(
        {
          url: request.url,
          method: request.method ?? 'GET',
          headers: request.headers ?? {},
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
        timing: { ...timing, pageMs: Math.round(performance.now() - started) },
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
    const forbidden = FORBIDDEN_FETCH_HEADERS.some((name) => request.headers?.[name] !== undefined);

    if (route === 'bridge' || forbidden) {
      if (route === 'fetch')
        throw new NetworkError('bridge-required', 'Referer and User-Agent need the bridge');
      if (!(await bridge()))
        throw new NetworkError(
          forbidden ? 'bridge-required' : 'unsupported',
          'No bridge installed',
          origin,
        );
      return viaBridge(request);
    }
    if (route === 'auto' && needsBridge.has(origin) && (await bridge())) return viaBridge(request);

    try {
      return await viaFetch(request);
    } catch (error) {
      if (request.signal?.aborted) throw new NetworkError('aborted', 'Aborted', origin);
      // A TypeError is all a page learns about CORS (or a dead network).
      if (route === 'auto' && error instanceof TypeError && (await bridge())) {
        const response = await viaBridge(request);
        needsBridge.add(origin);
        return response;
      }
      throw new NetworkError('blocked', 'The site does not allow reading it from here', origin, {
        cause: error,
      });
    }
  }

  return {
    request,
    bridge,
    requestAccess: (origins) => client.requestAccess(origins),
    imageHeaders: (rules) => client.imageHeaders(rules),
  };
}
