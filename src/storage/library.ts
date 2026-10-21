import type { Database } from '../platform/database';
import type { KeyValueStore } from '../platform/storage';
import type { BookMetadata, ReadingDirection, SourceKind } from '../sources/types';
import type { LayoutPreference } from './preferences';

/** One reading session, like a stamp on a library loan card. */
export interface LoanStamp {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  fromPage: number;
  toPage: number;
}

export interface LoanRecord extends LoanStamp {
  /** Auto-incremented: loans sort by it in the order they were made. */
  id?: number;
  bookId: string;
}

/** Why a book in the library has no copy of its file (the stage 2 notice explains it). */
export type MissingReason = 'disabled' | 'quota' | 'unavailable' | 'failed';

export type FileCopy =
  { status: 'stored'; storedAt: number } | { status: 'missing'; reason: MissingReason };

export type BookOrigin =
  { type: 'file'; name: string; size: number; copy?: FileCopy } | { type: 'url'; url: string };

/** Reader settings for this book only (L5); unset follows the global preferences. */
export interface BookSettings {
  layout?: LayoutPreference;
  coverAlone?: boolean;
}

/**
 * Everything kept about one file, keyed by its content identity (the source
 * id). With an accession number the book is in the library, with its
 * metadata and origin. Without one it is only progress memory: numbers, never
 * the file, its name or its title.
 */
export interface BookRecord {
  id: string;
  /** "Tombo": the library's sequential number, given when the book enters it. */
  accession?: number;
  kind?: SourceKind;
  origin?: BookOrigin;
  metadata?: BookMetadata;
  pageCount?: number;
  lastPage: number;
  /** When the last page was first reached (the "read" seal of stage 2). */
  finishedAt?: number;
  /** Reader's explicit choice; undefined follows the file. */
  direction?: ReadingDirection;
  settings?: BookSettings;
  addedAt?: number;
  readAt?: number;
  updatedAt: number;
}

/** What the reader needs about a book: its record and loan stamps, oldest first. */
export interface BookEntry {
  record: BookRecord;
  loans: LoanStamp[];
}

/** The page and loan stamps, as the loan card shows them. */
export interface ReadingMemory {
  lastPage: number;
  history: LoanStamp[];
}

export interface LibraryDetails {
  kind: SourceKind;
  origin: BookOrigin;
  metadata: BookMetadata;
  pageCount: number;
}

function keepCopy(origin: BookOrigin, previous: BookOrigin | undefined): BookOrigin {
  if (origin.type !== 'file' || origin.copy || previous?.type !== 'file' || !previous.copy)
    return origin;
  return { ...origin, copy: previous.copy };
}

const stamp = ({ date, fromPage, toPage }: LoanStamp): LoanStamp => ({ date, fromPage, toPage });
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The personal library over the async database. Writes go through one queue,
 * so a page turn and a direction change never overwrite each other.
 */
export class Library {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly open: () => Promise<Database>) {}

  private serial<T>(task: (db: Database) => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => task(await this.open()));
    this.queue = run.catch(() => undefined);
    return run;
  }

  get(id: string): Promise<BookRecord | undefined> {
    return this.serial((db) => db.get<BookRecord>('books', id));
  }

  all(): Promise<BookRecord[]> {
    return this.serial((db) => db.getAll<BookRecord>('books'));
  }

  private async loansOf(db: Database, id: string) {
    const loans = await db.getAll<LoanRecord>('loans', { index: 'bookId', value: id });
    return loans.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }

  loans(id: string): Promise<LoanStamp[]> {
    return this.serial(async (db) => (await this.loansOf(db, id)).map(stamp));
  }

  /**
   * What is remembered about a file. Memory kept under an id an older
   * version gave the same file moves to `id` on the way.
   */
  recall(id: string, legacyIds: readonly string[] = []): Promise<BookEntry | undefined> {
    return this.serial(async (db) => {
      let record = await db.get<BookRecord>('books', id);
      for (const legacyId of legacyIds) {
        if (record || legacyId === id) break;
        const legacy = await db.get<BookRecord>('books', legacyId);
        if (!legacy) continue;
        record = { ...legacy, id };
        const loans = await this.loansOf(db, legacyId);
        await db.batch([
          { type: 'put', store: 'books', value: record },
          { type: 'delete', store: 'books', key: legacyId },
          ...loans.map((loan) => ({
            type: 'put' as const,
            store: 'loans',
            value: { ...loan, bookId: id },
          })),
        ]);
      }
      if (!record) return undefined;
      return { record, loans: (await this.loansOf(db, id)).map(stamp) };
    });
  }

  /** Puts the book in the library (keeping its accession number if it has one). */
  addToLibrary(id: string, details: LibraryDetails, now = Date.now()): Promise<BookRecord> {
    return this.serial(async (db) => {
      const current = await db.get<BookRecord>('books', id);
      const accession = current?.accession ?? (await db.get<number>('meta', 'nextAccession')) ?? 1;
      const record: BookRecord = {
        lastPage: 1,
        ...current,
        ...details,
        // A copy made before stays known when the same file comes back.
        origin: keepCopy(details.origin, current?.origin),
        id,
        accession,
        addedAt: current?.addedAt ?? now,
        updatedAt: now,
      };
      await db.batch([
        { type: 'put', store: 'books', value: record },
        ...(current?.accession
          ? []
          : [{ type: 'put' as const, store: 'meta', key: 'nextAccession', value: accession + 1 }]),
      ]);
      return record;
    });
  }

  /**
   * Records where the reader is: the last page, today's loan stamp (merged
   * with an earlier one from today) and, at the last page, that it was read.
   */
  saveProgress(
    id: string,
    progress: { fromPage: number; page: number; pageCount: number; finished?: boolean },
    today = new Date(),
  ): Promise<void> {
    return this.serial(async (db) => {
      const now = today.getTime();
      const current = await db.get<BookRecord>('books', id);
      const record: BookRecord = {
        ...(current ?? { id }),
        lastPage: progress.page,
        pageCount: progress.pageCount,
        readAt: now,
        updatedAt: now,
      };
      if (progress.finished ?? progress.page >= progress.pageCount) record.finishedAt ??= now;
      const date = isoDate(today);
      const last = (await this.loansOf(db, id)).at(-1);
      const loan: LoanRecord =
        last && last.date === date
          ? { ...last, toPage: progress.page }
          : { bookId: id, date, fromPage: progress.fromPage, toPage: progress.page };
      await db.batch([
        { type: 'put', store: 'books', value: record },
        { type: 'put', store: 'loans', value: loan },
      ]);
    });
  }

  /** Changes a few fields of a remembered book (creating its memory if needed). */
  update(
    id: string,
    patch: Partial<Pick<BookRecord, 'direction' | 'settings' | 'origin'>>,
    now = Date.now(),
  ): Promise<BookRecord> {
    return this.serial(async (db) => {
      const current = await db.get<BookRecord>('books', id);
      const record: BookRecord = { lastPage: 1, ...current, ...patch, id, updatedAt: now };
      await db.put('books', record);
      return record;
    });
  }

  /** Records whether the library holds its own copy of a local file. */
  setCopy(id: string, copy: FileCopy): Promise<void> {
    return this.serial(async (db) => {
      await db.update<BookRecord>('books', id, (current) =>
        current?.origin?.type === 'file'
          ? { ...current, origin: { ...current.origin, copy }, updatedAt: Date.now() }
          : current,
      );
    });
  }

  setCover(id: string, cover: Blob): Promise<void> {
    return this.serial(async (db) => void (await db.put('covers', { bookId: id, cover })));
  }

  cover(id: string): Promise<Blob | undefined> {
    return this.serial(async (db) => (await db.get<{ cover: Blob }>('covers', id))?.cover);
  }
}

/** The localStorage library of 0.2 and earlier (src/storage/books.ts). */
interface LegacyRecord {
  lastPage?: number;
  direction?: ReadingDirection;
  history?: LoanStamp[];
  touched?: number;
}

export const LEGACY_KEY = 'books';

/**
 * Moves the old localStorage memory (numbers keyed by the old file id) into
 * the database as progress memory. Its key is removed only after the
 * database took everything; records the database already has are kept.
 */
export async function migrateLegacyMemory(db: Database, storage: KeyValueStore) {
  const raw = storage.get(LEGACY_KEY);
  if (raw === null) return;
  let legacy: Record<string, LegacyRecord>;
  try {
    legacy = JSON.parse(raw) as Record<string, LegacyRecord>;
    if (typeof legacy !== 'object' || legacy === null) throw new TypeError('Not an object');
  } catch {
    storage.remove(LEGACY_KEY); // Unreadable: there is nothing left to save.
    return;
  }
  const known = new Set(await db.getAllKeys('books'));
  const writes = Object.entries(legacy)
    .filter(([id]) => !known.has(id))
    .flatMap(([id, old]) => {
      const touched = typeof old.touched === 'number' ? old.touched : Date.now();
      const record: BookRecord = {
        id,
        lastPage: typeof old.lastPage === 'number' && old.lastPage > 0 ? old.lastPage : 1,
        ...(old.direction === 'ltr' || old.direction === 'rtl' ? { direction: old.direction } : {}),
        readAt: touched,
        updatedAt: touched,
      };
      const loans = (Array.isArray(old.history) ? old.history : []).map((entry): LoanRecord => ({
        ...stamp(entry),
        bookId: id,
      }));
      return [
        { type: 'put' as const, store: 'books', value: record },
        ...loans.map((value) => ({ type: 'put' as const, store: 'loans', value })),
      ];
    });
  await db.batch(writes);
  storage.remove(LEGACY_KEY);
}
