import type { Schema } from '../platform/database';

/**
 * The library's stores, as numbered migrations (src/platform/database.ts).
 * Add a version to change them; never edit a version that has shipped.
 *
 * - `books`: one record per file identity. With an accession number it is in
 *   the library; without one it is only progress memory (numbers).
 * - `loans`: reading sessions (the stamps on the loan card), by book.
 * - `covers`: a small JPEG per book, keyed by book id.
 * - `meta`: the next accession number and other single values.
 *
 * Planned: `shelves` (stage 3) and `bookmarks` (stage 4).
 */
export const librarySchema: Schema = [
  {
    version: 1,
    stores: {
      books: {
        keyPath: 'id',
        indexes: { accession: { keyPath: 'accession', unique: true } },
      },
      loans: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: { bookId: { keyPath: 'bookId' } },
      },
      covers: { keyPath: 'bookId' },
      meta: {},
    },
  },
];
