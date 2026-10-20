import { createStore } from '../lib/store';

export type Route = { name: 'home' } | { name: 'styleguide' };

export function parseHash(hash: string): Route {
  if (hash.startsWith('#/estilo')) return { name: 'styleguide' };
  return { name: 'home' };
}

export const route = createStore<Route>(parseHash(window.location.hash));

window.addEventListener('hashchange', () => route.set(parseHash(window.location.hash)));
