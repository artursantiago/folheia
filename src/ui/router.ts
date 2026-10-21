import { createStore } from '../lib/store';

/**
 * Routes live in the hash, so any static host (and later a Capacitor
 * WebView) serves every one of them from the same index.html:
 *
 * - `#/`: home;
 * - `#/ler/<accession>?p=42`: a book of the library, at a page;
 * - `#/ler?p=42`: a book outside it (by URL, `?file=` in the query, or an example);
 * - `#/estilo` and `#/lab`: the developer pages.
 *
 * The `#p=42` of older versions still reads as `#/ler?p=42`.
 */
export type Route =
  | { name: 'home' }
  | { name: 'reader'; accession?: number | undefined; page?: number | undefined }
  | { name: 'styleguide' }
  | { name: 'lab' };

export function parseHash(hash: string): Route {
  if (hash.startsWith('#/estilo')) return { name: 'styleguide' };
  if (hash.startsWith('#/lab')) return { name: 'lab' };
  const reader = hash.match(/^#\/ler(?:\/(\d+))?\/?(?:\?(.*))?$/);
  if (reader) {
    const page = Number(new URLSearchParams(reader[2] ?? '').get('p'));
    return {
      name: 'reader',
      ...(reader[1] && { accession: Number(reader[1]) }),
      ...(page > 0 && { page }),
    };
  }
  const legacy = hash.match(/^#p=(\d+)$/);
  if (legacy) return { name: 'reader', page: Number(legacy[1]) };
  return { name: 'home' };
}

export function formatHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'styleguide':
      return '#/estilo';
    case 'lab':
      return '#/lab';
    case 'reader':
      return `#/ler${route.accession ? `/${route.accession}` : ''}${route.page ? `?p=${route.page}` : ''}`;
  }
}

/** The book in the address: `?file=` for books by URL. */
export function fileInAddress(href = window.location.href): string | undefined {
  return new URL(href).searchParams.get('file') ?? undefined;
}

/** The route of an address: a `?file=` link without a reader hash still opens the reader. */
function routeOf(href: string): Route {
  const url = new URL(href);
  const parsed = parseHash(url.hash);
  return parsed.name === 'home' && url.searchParams.has('file') ? { name: 'reader' } : parsed;
}

export const route = createStore<Route>(routeOf(window.location.href));

/** Our entries in the history state. */
interface EntryState {
  /** The entry below is the app's home: Back can go there instead of leaving. */
  folheiaHome?: boolean;
  /** A dialog or drawer, closed by Back. */
  folheiaLayer?: number;
}

const entry = (): EntryState => (history.state ?? {}) as EntryState;

function addressFor(next: Route, file?: string) {
  const url = new URL(window.location.href);
  url.search = '';
  if (file) url.searchParams.set('file', file);
  url.hash = formatHash(next);
  return url.href;
}

/** The address we last put in the bar (the page changes it while a layer is on top). */
let lastAddress = window.location.href;

function replace(href: string, state: EntryState = entry()) {
  lastAddress = href;
  if (href !== window.location.href || state !== history.state)
    history.replaceState(state, '', href);
}

function push(href: string, state: EntryState) {
  lastAddress = href;
  history.pushState(state, '', href);
}

/**
 * The reader is on the way: a new history entry, so Back closes the book.
 * When the address already holds a book (a link, a reload) it is replaced,
 * with home put underneath once, so Back still lands in the app.
 */
export function enterReader(file?: string) {
  const current = route.get();
  if (current.name === 'reader') {
    const href = addressFor(current, file);
    if (entry().folheiaHome) replace(href);
    else {
      replace(addressFor({ name: 'home' }), {});
      push(href, { folheiaHome: true });
    }
    return;
  }
  const next: Route = { name: 'reader' };
  push(addressFor(next, file), { folheiaHome: true });
  route.set(next);
}

/** Keeps the address on the book's current page (replaces, never pushes). */
export function showReaderPage(accession: number | undefined, page: number) {
  const current = route.get();
  if (current.name !== 'reader') return;
  const next: Route = { name: 'reader', accession, page };
  replace(addressFor(next, fileInAddress()), entry());
  if (current.accession !== accession || current.page !== page) route.set(next);
}

/** Leaves the reader for home: Back when home is underneath, a replace otherwise. */
export function leaveReader() {
  if (route.get().name !== 'reader') return;
  if (entry().folheiaHome && layers.length === 0) {
    history.back();
    return;
  }
  replace(addressFor({ name: 'home' }), {});
  route.set({ name: 'home' });
}

interface Layer {
  id: number;
  close: () => void;
}

const layers: Layer[] = [];
let nextLayer = 1;
/** Back calls we made ourselves, whose popstate must not close anything. */
let ownBacks = 0;

/**
 * A dialog or drawer opened over the screen: Back closes it before
 * anything else. Call the returned function when the UI closes it.
 */
export function pushLayer(close: () => void): () => void {
  const id = nextLayer++;
  layers.push({ id, close });
  push(window.location.href, { ...entry(), folheiaLayer: id });
  return () => {
    const index = layers.findIndex((layer) => layer.id === id);
    if (index === -1) return; // Already closed by Back.
    layers.splice(index, 1);
    ownBacks++;
    history.back();
  };
}

window.addEventListener('popstate', () => {
  if (ownBacks > 0) {
    ownBacks--;
    // The page may have changed while the layer was open.
    if (lastAddress !== window.location.href) replace(lastAddress);
    return;
  }
  const top = layers.pop();
  if (top) {
    top.close();
    return;
  }
  lastAddress = window.location.href;
  route.set(routeOf(window.location.href));
});
