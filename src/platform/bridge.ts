// Client for the Folheia network bridge (extension or userscript, see
// extension/): window messages to the bridge, which runs outside the page's
// CORS rules. Protocol in extension/src/protocol.ts.
import {
  LIMITS,
  PROTOCOL_VERSION,
  isBridgeMessage,
  wrap,
  type BridgeErrorCode,
  type BridgeInfo,
  type BridgeMessage,
  type BridgeRequest,
  type PageMessage,
  type ResponseHead,
  type Timing,
} from '../../extension/src/protocol';

export type { BridgeInfo, BridgeRequest };

export class BridgeError extends Error {
  override readonly name = 'BridgeError';
  constructor(
    readonly code: BridgeErrorCode,
    message: string,
    /** For "not-allowed": the origin the user has to approve in the bridge. */
    readonly origin?: string,
  ) {
    super(message);
  }
}

export interface BridgeResponse {
  head: ResponseHead;
  body: ArrayBuffer;
  timing: Timing;
}

export interface BridgeFetchOptions {
  signal?: AbortSignal | undefined;
  /** Bytes received so far, as chunks arrive. */
  onProgress?: ((received: number) => void) | undefined;
}

export interface BridgeClient {
  /** The installed bridge, or undefined when none answers in time. */
  detect(timeoutMs?: number): Promise<BridgeInfo | undefined>;
  fetch(request: BridgeRequest, options?: BridgeFetchOptions): Promise<BridgeResponse>;
  /** Opens the bridge's own approval screen; false when it has none. */
  requestAccess(origins: string[]): Promise<boolean>;
}

/** Same major protocol: the only kind of bridge the page talks to. */
export function isCompatible(info: BridgeInfo) {
  return info.protocol === PROTOCOL_VERSION;
}

type Handler = (message: BridgeMessage) => void;

/** randomUUID needs a secure context; a dev server reached by LAN IP isn't one. */
const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function createBridgeClient(): BridgeClient {
  let info: BridgeInfo | undefined;
  const handlers = new Map<string, Handler>();
  const waitingForInfo = new Set<() => void>();
  let listening = false;

  function listen() {
    if (listening) return;
    listening = true;
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      if (!isBridgeMessage(event.data)) return;
      const message = event.data;
      if (message.type === 'ready' || message.type === 'hello') {
        info = message.info;
        for (const resolve of waitingForInfo) resolve();
        waitingForInfo.clear();
      }
      if ('id' in message) handlers.get(message.id)?.(message);
    });
  }

  function post(message: PageMessage) {
    window.postMessage(wrap('page', message), location.origin);
  }

  async function detect(timeoutMs = 400) {
    listen();
    if (info) return info;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        waitingForInfo.delete(done);
        resolve();
      };
      const timer = setTimeout(done, timeoutMs);
      waitingForInfo.add(done);
      post({ type: 'hello', id: newId(), protocol: PROTOCOL_VERSION });
    });
    return info;
  }

  async function fetch(request: BridgeRequest, options: BridgeFetchOptions = {}) {
    const bridge = await detect();
    if (!bridge) throw new BridgeError('unsupported', 'No bridge installed');
    if (!isCompatible(bridge))
      throw new BridgeError('unsupported', `Bridge speaks protocol ${bridge.protocol}`);
    const { signal, onProgress } = options;
    if (signal?.aborted) throw new BridgeError('aborted', 'Aborted');

    const id = newId();
    return new Promise<BridgeResponse>((resolve, reject) => {
      let head: ResponseHead | undefined;
      const chunks: ArrayBuffer[] = [];
      let received = 0;
      const onAbort = () => post({ type: 'abort', id });
      // In case the bridge disappears mid-request (extension reloaded…).
      const guard = setTimeout(
        () => finish(new BridgeError('timeout', 'The bridge stopped answering')),
        (request.timeoutMs ?? LIMITS.defaultTimeoutMs) + 5_000,
      );
      function finish(error?: BridgeError, timing?: Timing) {
        clearTimeout(guard);
        handlers.delete(id);
        signal?.removeEventListener('abort', onAbort);
        if (error || !head || !timing) {
          reject(error ?? new BridgeError('network', 'Incomplete response'));
          return;
        }
        const body = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }
        resolve({ head, body: body.buffer, timing });
      }
      handlers.set(id, (message) => {
        switch (message.type) {
          case 'head':
            head = message.head;
            break;
          case 'chunk':
            chunks.push(message.data);
            received += message.data.byteLength;
            onProgress?.(received);
            break;
          case 'end':
            finish(undefined, message.timing);
            break;
          case 'error':
            finish(
              new BridgeError(message.error.code, message.error.message, message.error.origin),
            );
            break;
        }
      });
      signal?.addEventListener('abort', onAbort, { once: true });
      post({ type: 'fetch', id, request });
    });
  }

  async function requestAccess(origins: string[]) {
    if (!(await detect())) return false;
    const id = newId();
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        handlers.delete(id);
        resolve(false);
      }, 5_000);
      handlers.set(id, (message) => {
        if (message.type !== 'access') return;
        clearTimeout(timer);
        handlers.delete(id);
        resolve(message.shown);
      });
      post({ type: 'request-access', id, origins });
    });
  }

  return { detect, fetch, requestAccess };
}
