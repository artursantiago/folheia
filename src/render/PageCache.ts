export interface CachedImage {
  key: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
}

interface UrlFactory {
  create(blob: Blob): string;
  revoke(url: string): void;
}

const browserUrls: UrlFactory = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

/**
 * How far an entry is from the reader: over budget, the farthest goes first.
 * Entries at the same distance go least recently used first.
 */
export type CacheDistance = (key: string) => number;

/**
 * Compressed page images within a byte budget. Without a distance, least
 * recently used first out. Pinned keys (what's on screen) are never evicted.
 */
export class PageCache {
  private entries = new Map<string, CachedImage>();
  private bytes = 0;

  constructor(
    private maxBytes: number,
    private readonly urls: UrlFactory = browserUrls,
    private readonly distance: CacheDistance = () => 0,
  ) {}

  get(key: string): CachedImage | undefined {
    const entry = this.entries.get(key);
    if (entry) {
      // Re-insert to mark as most recently used.
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    return entry;
  }

  peek(key: string) {
    return this.entries.get(key);
  }

  set(
    key: string,
    blob: Blob,
    width: number,
    height: number,
    pinned: ReadonlySet<string> = new Set(),
  ): CachedImage {
    this.delete(key);
    const entry: CachedImage = {
      key,
      url: this.urls.create(blob),
      bytes: blob.size,
      width,
      height,
    };
    this.entries.set(key, entry);
    this.bytes += entry.bytes;
    this.evict(pinned);
    return entry;
  }

  delete(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    this.bytes -= entry.bytes;
    this.urls.revoke(entry.url);
  }

  /** First entry whose key starts with `prefix` (without touching its recency). */
  findByPrefix(prefix: string): CachedImage | undefined {
    for (const [key, entry] of this.entries) if (key.startsWith(prefix)) return entry;
    return undefined;
  }

  keys() {
    return [...this.entries.keys()];
  }

  /** Drops entries the caller no longer wants, regardless of budget. */
  retain(keep: (key: string) => boolean) {
    for (const key of [...this.entries.keys()]) if (!keep(key)) this.delete(key);
  }

  setBudget(maxBytes: number, pinned: ReadonlySet<string> = new Set()) {
    this.maxBytes = maxBytes;
    this.evict(pinned);
  }

  clear() {
    this.retain(() => false);
  }

  get totalBytes() {
    return this.bytes;
  }

  get count() {
    return this.entries.size;
  }

  private evict(pinned: ReadonlySet<string>) {
    if (this.bytes <= this.maxBytes) return;
    // Map order is recency order, and the sort is stable.
    const candidates = [...this.entries.keys()]
      .filter((key) => !pinned.has(key))
      .map((key) => ({ key, distance: this.distance(key) }))
      .sort((a, b) => b.distance - a.distance);
    for (const { key } of candidates) {
      if (this.bytes <= this.maxBytes) return;
      this.delete(key);
    }
  }
}
