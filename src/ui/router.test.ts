import type * as Router from './router';
import { formatHash, parseHash } from './router';

describe('parseHash', () => {
  it('reads every route', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/estilo')).toEqual({ name: 'styleguide' });
    expect(parseHash('#/lab')).toEqual({ name: 'lab' });
    expect(parseHash('#/ler/7?p=42')).toEqual({ name: 'reader', accession: 7, page: 42 });
    expect(parseHash('#/ler/7')).toEqual({ name: 'reader', accession: 7 });
    expect(parseHash('#/ler?p=3')).toEqual({ name: 'reader', page: 3 });
    expect(parseHash('#/ler')).toEqual({ name: 'reader' });
  });

  it('still reads the #p= of older versions', () => {
    expect(parseHash('#p=9')).toEqual({ name: 'reader', page: 9 });
  });

  it('round-trips with formatHash', () => {
    for (const hash of ['#/', '#/estilo', '#/lab', '#/ler/7?p=42', '#/ler?p=3', '#/ler'])
      expect(formatHash(parseHash(hash))).toBe(hash);
  });
});

/** Waits for the popstate that history.back() queues. */
const popped = () =>
  new Promise<void>((resolve) =>
    window.addEventListener('popstate', () => setTimeout(resolve), { once: true }),
  );

describe('history', () => {
  let router: typeof Router;
  beforeEach(async () => {
    history.replaceState(null, '', '/');
    vi.resetModules();
    router = await import('./router');
  });

  it('pushes the reader, so Back returns home', async () => {
    router.enterReader();
    router.showReaderPage(7, 12);
    expect(window.location.hash).toBe('#/ler/7?p=12');
    expect(router.route.get()).toEqual({ name: 'reader', accession: 7, page: 12 });
    const back = popped();
    router.leaveReader();
    await back;
    expect(router.route.get()).toEqual({ name: 'home' });
  });

  it('puts home under a reader that came from the address, and keeps ?file=', async () => {
    history.replaceState(null, '', '/?file=https%3A%2F%2Fx.example%2Fa.pdf#p=9');
    vi.resetModules();
    router = await import('./router');
    router.enterReader('https://x.example/a.pdf');
    expect(window.location.search).toBe('?file=https%3A%2F%2Fx.example%2Fa.pdf');
    expect(window.location.hash).toBe('#/ler?p=9');
    const back = popped();
    history.back();
    await back;
    expect(router.route.get()).toEqual({ name: 'home' });
    expect(window.location.search).toBe('');
  });

  it('closes the top layer on Back before leaving the reader', async () => {
    router.enterReader();
    const close = vi.fn();
    router.pushLayer(close);
    const back = popped();
    history.back();
    await back;
    expect(close).toHaveBeenCalledOnce();
    expect(router.route.get().name).toBe('reader');
  });

  it('takes its entry back when the UI closes a layer, keeping the latest page', async () => {
    router.enterReader();
    const close = vi.fn();
    const release = router.pushLayer(close);
    router.showReaderPage(undefined, 5);
    const back = popped();
    release();
    await back;
    expect(close).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/ler?p=5');
    expect(router.route.get().name).toBe('reader');
  });
});
