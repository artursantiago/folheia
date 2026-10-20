import { PageCache } from './PageCache';

function fakeUrls() {
  const live = new Set<string>();
  let n = 0;
  return {
    live,
    create: () => {
      const url = `blob:${n++}`;
      live.add(url);
      return url;
    },
    revoke: (url: string) => live.delete(url),
  };
}

const blob = (size: number) => new Blob([new Uint8Array(size)]);

describe('PageCache', () => {
  it('evicts least recently used entries over budget and revokes their URLs', () => {
    const urls = fakeUrls();
    const cache = new PageCache(300, urls);
    cache.set('a', blob(100), 1, 1);
    cache.set('b', blob(100), 1, 1);
    cache.set('c', blob(100), 1, 1);
    cache.get('a');
    cache.set('d', blob(100), 1, 1);
    expect(cache.peek('b')).toBeUndefined();
    expect(cache.peek('a')).toBeDefined();
    expect(cache.totalBytes).toBe(300);
    expect(urls.live.size).toBe(3);
  });

  it('never evicts pinned entries', () => {
    const cache = new PageCache(100, fakeUrls());
    cache.set('visible', blob(100), 1, 1);
    cache.set('other', blob(100), 1, 1, new Set(['visible', 'other']));
    expect(cache.count).toBe(2);
    cache.setBudget(100, new Set(['visible']));
    expect(cache.peek('other')).toBeUndefined();
    expect(cache.peek('visible')).toBeDefined();
  });

  it('with a distance, evicts the farthest entry first, whatever its recency', () => {
    const distance: Record<string, number> = { behind: 3, ahead: 1, far: 2 };
    const cache = new PageCache(300, fakeUrls(), (key) => distance[key] ?? Infinity);
    cache.set('ahead', blob(100), 1, 1);
    cache.set('behind', blob(100), 1, 1);
    cache.set('far', blob(100), 1, 1);
    cache.get('behind');
    cache.set('visible', blob(100), 1, 1, new Set(['visible']));
    expect(cache.peek('behind')).toBeUndefined();
    expect(cache.keys().sort()).toEqual(['ahead', 'far', 'visible']);
  });

  it('replacing a key frees the old image', () => {
    const urls = fakeUrls();
    const cache = new PageCache(1000, urls);
    cache.set('a', blob(10), 1, 1);
    cache.set('a', blob(20), 1, 1);
    expect(urls.live.size).toBe(1);
    expect(cache.totalBytes).toBe(20);
  });
});
