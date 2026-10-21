import type { Database, WriteOperation } from '../platform/database';
import type { BookRecord, Library, LoanRecord, LoanStamp } from './library';

/**
 * The library as a JSON file, to move it to another browser or to the
 * Android app (another origin). Records and loan stamps travel; covers and
 * the books' files don't. Versioned, so any reader can tell what it got.
 */
export interface LibraryBackup {
  format: 'folheia-library';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: string;
  nextAccession: number;
  books: (BookRecord & { loans: LoanStamp[] })[];
}

export const BACKUP_VERSION = 1;

export class BackupError extends Error {
  override readonly name = 'BackupError';
  constructor(
    readonly code: 'not-a-backup' | 'newer-version',
    message: string,
  ) {
    super(message);
  }
}

const stamp = ({ date, fromPage, toPage }: LoanStamp): LoanStamp => ({ date, fromPage, toPage });

async function loansByBook(db: Database) {
  const loans = await db.getAll<LoanRecord>('loans');
  const byBook = new Map<string, LoanRecord[]>();
  for (const loan of loans.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)))
    byBook.set(loan.bookId, [...(byBook.get(loan.bookId) ?? []), loan]);
  return byBook;
}

export function exportLibrary(library: Library, now = new Date()): Promise<LibraryBackup> {
  return library.withDatabase(async (db) => {
    const books = await db.getAll<BookRecord>('books');
    const loans = await loansByBook(db);
    return {
      format: 'folheia-library',
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      app: __APP_VERSION__,
      nextAccession: (await db.get<number>('meta', 'nextAccession')) ?? 1,
      books: books.map((book) => ({ ...book, loans: (loans.get(book.id) ?? []).map(stamp) })),
    };
  });
}

/** Checks that `data` is a backup this version can read. */
export function parseBackup(data: unknown): LibraryBackup {
  const value = data as Partial<LibraryBackup> | null;
  if (
    typeof value !== 'object' ||
    value === null ||
    value.format !== 'folheia-library' ||
    typeof value.version !== 'number' ||
    !Array.isArray(value.books)
  )
    throw new BackupError('not-a-backup', 'This is not a Folheia library file');
  if (value.version > BACKUP_VERSION)
    throw new BackupError('newer-version', 'Made by a newer Folheia: update the app first');
  const books = value.books.filter(
    (book): book is LibraryBackup['books'][number] =>
      typeof book === 'object' &&
      book !== null &&
      typeof book.id === 'string' &&
      typeof book.lastPage === 'number',
  );
  return { ...(value as LibraryBackup), books };
}

export interface ImportPlan {
  backup: LibraryBackup;
  /** Books this library doesn't have yet. */
  added: string[];
  /** Books it has: kept unless the import is told to overwrite them. */
  existing: string[];
}

export function planImport(library: Library, backup: LibraryBackup): Promise<ImportPlan> {
  return library.withDatabase(async (db) => {
    const known = new Set(await db.getAllKeys('books'));
    const ids = backup.books.map((book) => book.id);
    return {
      backup,
      added: ids.filter((id) => !known.has(id)),
      existing: ids.filter((id) => known.has(id)),
    };
  });
}

/**
 * Merges the backup by file identity. New books keep their accession number
 * unless this library already gave it to another book. Existing books change
 * only with `overwrite` (the reader's confirmation): the backup's progress
 * and settings win, they keep their local accession number and copy, and
 * loan stamps are joined.
 */
export function applyImport(
  library: Library,
  plan: ImportPlan,
  options: { overwrite: boolean } = { overwrite: false },
): Promise<{ added: number; updated: number }> {
  return library.withDatabase(async (db) => {
    const local = new Map((await db.getAll<BookRecord>('books')).map((book) => [book.id, book]));
    const takenAccessions = new Set(
      [...local.values()].flatMap((book) => (book.accession ? [book.accession] : [])),
    );
    const loans = await loansByBook(db);
    let next = Math.max(
      (await db.get<number>('meta', 'nextAccession')) ?? 1,
      plan.backup.nextAccession,
      ...[...takenAccessions].map((n) => n + 1),
    );
    const writes: WriteOperation[] = [];
    let added = 0;
    let updated = 0;

    for (const { loans: stamps, ...imported } of plan.backup.books) {
      const current = local.get(imported.id);
      if (current && !options.overwrite) continue;
      // The file's copy belongs to the device that made it.
      const origin =
        imported.origin?.type === 'file'
          ? { type: 'file' as const, name: imported.origin.name, size: imported.origin.size }
          : imported.origin;
      let record: BookRecord = { ...imported, ...(origin && { origin }) };
      if (current) {
        const accession = current.accession ?? record.accession;
        record = {
          ...record,
          ...(current.origin && { origin: current.origin }),
          ...(accession !== undefined && { accession }),
        };
        updated++;
      } else {
        added++;
      }
      if (record.accession !== undefined && record.accession !== current?.accession) {
        if (takenAccessions.has(record.accession)) record.accession = next++;
        takenAccessions.add(record.accession);
        next = Math.max(next, record.accession + 1);
      }
      writes.push({ type: 'put', store: 'books', value: record });
      const have = new Set(
        (loans.get(record.id) ?? []).map((loan) => `${loan.date}:${loan.fromPage}:${loan.toPage}`),
      );
      for (const loan of stamps ?? []) {
        const key = `${loan.date}:${loan.fromPage}:${loan.toPage}`;
        if (have.has(key)) continue;
        have.add(key);
        writes.push({ type: 'put', store: 'loans', value: { ...stamp(loan), bookId: record.id } });
      }
    }
    writes.push({ type: 'put', store: 'meta', key: 'nextAccession', value: next });
    await db.batch(writes);
    return { added, updated };
  });
}
