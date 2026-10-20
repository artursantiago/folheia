import type { ReadingDirection } from '../sources/types';
import { webStorage, type KeyValueStore } from '../platform/storage';

/** One reading session, like a stamp on a library loan card. */
export interface LoanStamp {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  fromPage: number;
  toPage: number;
}

export interface BookRecord {
  lastPage: number;
  /** Reader's explicit choice; undefined follows the file. */
  direction?: ReadingDirection | undefined;
  history: LoanStamp[];
}

const KEY = 'books';
const MAX_BOOKS = 200;
const MAX_STAMPS = 6;

type Library = Record<string, BookRecord & { touched: number }>;

/**
 * Per-book memory (last page, direction, reading history), keyed by the
 * file's fingerprint. Only numbers are stored: never the file or its name.
 */
export class BookMemory {
  constructor(private readonly storage: KeyValueStore = webStorage) {}

  private load(): Library {
    try {
      const raw = this.storage.get(KEY);
      return raw ? (JSON.parse(raw) as Library) : {};
    } catch {
      return {};
    }
  }

  private save(library: Library) {
    const entries = Object.entries(library).sort(([, a], [, b]) => b.touched - a.touched);
    this.storage.set(KEY, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_BOOKS))));
  }

  get(id: string): BookRecord | undefined {
    const record = this.load()[id];
    if (!record) return undefined;
    return {
      lastPage: record.lastPage,
      direction: record.direction,
      history: record.history ?? [],
    };
  }

  update(id: string, patch: Partial<BookRecord>) {
    const library = this.load();
    const current = library[id] ?? { lastPage: 1, history: [], touched: 0 };
    library[id] = { ...current, ...patch, touched: Date.now() };
    this.save(library);
  }

  /** Records progress for today's session, merging with an open stamp from today. */
  recordProgress(id: string, fromPage: number, toPage: number, today = new Date()) {
    const date = today.toISOString().slice(0, 10);
    const record = this.get(id) ?? { lastPage: 1, history: [] };
    const history = [...record.history];
    const last = history[history.length - 1];
    if (last && last.date === date) history[history.length - 1] = { ...last, toPage };
    else history.push({ date, fromPage, toPage });
    this.update(id, { lastPage: toPage, history: history.slice(-MAX_STAMPS) });
  }
}

export const bookMemory = new BookMemory();
