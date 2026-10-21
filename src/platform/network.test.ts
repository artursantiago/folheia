import { isPageMessage, wrap, type BridgeMessage, type PageMessage } from './bridge/protocol';
import { createBridgeClient } from './bridge/client';
import { NetworkError, createWebNetwork, rangeTotal, webNetwork } from './network';

type Reply = (message: BridgeMessage, transfer?: Transferable[]) => void;

/** A stand-in for the extension: answers on the page's own window. */
function installFakeBridge(onRequest: (message: PageMessage, reply: Reply) => void) {
  const reply: Reply = (message, transfer = []) =>
    window.postMessage(wrap('bridge', message), location.origin, transfer);
  const listener = (event: MessageEvent) => {
    if (!isPageMessage(event.data)) return;
    const message = event.data;
    if (message.type === 'hello')
      reply({
        type: 'hello',
        id: message.id,
        info: { protocol: 1, kind: 'extension', version: 'test', host: 'jsdom' },
      });
    else onRequest(message, reply);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('web network', () => {
  let uninstall: (() => void) | undefined;
  // jsdom leaves event.source empty, and the bridge checks it: deliver like a browser.
  beforeEach(() => {
    vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => {
      setTimeout(() =>
        window.dispatchEvent(
          new MessageEvent('message', { data, origin: location.origin, source: window }),
        ),
      );
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    uninstall?.();
    uninstall = undefined;
    vi.unstubAllGlobals();
  });

  it('uses plain fetch when the site allows it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('hi', { status: 200 })),
    );
    const network = createWebNetwork({ bridge: createBridgeClient() });
    const response = await network.request({ url: 'https://cors.example/a' });
    expect(response.via).toBe('fetch');
    expect(new TextDecoder().decode(response.body)).toBe('hi');
  });

  it('falls back to the bridge when CORS blocks fetch, then goes straight to it', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    const seen: PageMessage[] = [];
    uninstall = installFakeBridge((message, reply) => {
      seen.push(message);
      if (message.type !== 'fetch') return;
      reply({
        type: 'head',
        id: message.id,
        head: {
          status: 200,
          statusText: 'OK',
          url: message.request.url,
          headers: [['content-type', 'text/plain']],
        },
      });
      const a = encode('hello ');
      const b = encode('bridge');
      reply({ type: 'chunk', id: message.id, data: a }, [a]);
      reply({ type: 'chunk', id: message.id, data: b }, [b]);
      reply({ type: 'end', id: message.id, timing: { headersMs: 1, totalMs: 2 } });
    });
    const network = createWebNetwork({ bridge: createBridgeClient() });
    const progress: number[] = [];
    const first = await network.request({
      url: 'https://nocors.example/x',
      onProgress: (n) => progress.push(n),
    });
    expect(first.via).toBe('bridge');
    expect(first.headers.get('content-type')).toBe('text/plain');
    expect(new TextDecoder().decode(first.body)).toBe('hello bridge');
    expect(progress).toEqual([6, 12]);

    await network.request({ url: 'https://nocors.example/y' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(seen.filter((m) => m.type === 'fetch')).toHaveLength(2);
  });

  it('sends Referer and User-Agent only through the bridge', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const network = createWebNetwork({ bridge: createBridgeClient() });
    // No bridge installed.
    await expect(
      network.request({ url: 'https://x.example/', headers: { referer: 'https://x.example/' } }),
    ).rejects.toMatchObject({ code: 'bridge-required' });
    expect(fetchMock).not.toHaveBeenCalled();

    let headers: unknown;
    uninstall = installFakeBridge((message, reply) => {
      if (message.type !== 'fetch') return;
      headers = message.request.headers;
      reply({
        type: 'head',
        id: message.id,
        head: { status: 204, statusText: '', url: message.request.url, headers: [] },
      });
      reply({ type: 'end', id: message.id, timing: { headersMs: 1, totalMs: 1 } });
    });
    const response = await network.request({
      url: 'https://x.example/',
      headers: { referer: 'https://x.example/', 'user-agent': 'Folheia/0.1' },
    });
    expect(response.status).toBe(204);
    expect(headers).toEqual({ referer: 'https://x.example/', 'user-agent': 'Folheia/0.1' });
  });

  it('reports bridge refusals with the origin to approve, and aborts', async () => {
    uninstall = installFakeBridge((message, reply) => {
      if (message.type === 'fetch' && message.request.url.includes('denied'))
        reply({
          type: 'error',
          id: message.id,
          error: { code: 'not-allowed', message: 'no', origin: 'https://denied.example' },
        });
      if (message.type === 'abort')
        reply({ type: 'error', id: message.id, error: { code: 'aborted', message: 'Aborted' } });
    });
    const network = createWebNetwork({ bridge: createBridgeClient() });
    const refused = network.request({ url: 'https://denied.example/', route: 'bridge' });
    await expect(refused).rejects.toBeInstanceOf(NetworkError);
    await expect(refused).rejects.toMatchObject({
      code: 'not-allowed',
      origin: 'https://denied.example',
    });

    const controller = new AbortController();
    const slow = network.request({
      url: 'https://slow.example/',
      route: 'bridge',
      signal: controller.signal,
    });
    controller.abort();
    await expect(slow).rejects.toMatchObject({ code: 'aborted' });
  });

  it('sends ranges past the HTTP cache', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        new Response('ab', { status: 206, headers: { 'Content-Range': 'bytes 10-11/40' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await webNetwork.request({
      url: 'https://cors.example/book.pdf',
      range: { begin: 10, end: 12 },
    });
    const init = fetchMock.mock.calls[0]![1];
    expect(init.headers).toEqual({ range: 'bytes=10-11' });
    expect(init.cache).toBe('no-store');
    expect(init.credentials).toBe('omit');
    expect(rangeTotal(response)).toBe(40);
  });

  it('never uses a bridge it was not built with, even when one is installed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const seen: PageMessage[] = [];
    uninstall = installFakeBridge((message) => seen.push(message));
    await expect(webNetwork.request({ url: 'https://nocors.example/' })).rejects.toMatchObject({
      code: 'blocked',
    });
    expect(webNetwork.bridge).toBeUndefined();
    expect(seen).toEqual([]);
  });

  it('says "blocked" when fetch fails and there is no bridge', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const network = createWebNetwork({ bridge: createBridgeClient() });
    await expect(network.request({ url: 'https://nocors.example/' })).rejects.toMatchObject({
      code: 'blocked',
    });
  });
});
