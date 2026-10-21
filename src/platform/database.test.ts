import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { memoryDatabase, openWebDatabase, storesOf, type Database, type Schema } from './database';

const schema: Schema = [
  {
    version: 1,
    stores: {
      books: { keyPath: 'id', indexes: { accession: { keyPath: 'accession', unique: true } } },
      loans: { keyPath: 'id', autoIncrement: true, indexes: { bookId: { keyPath: 'bookId' } } },
      meta: {},
      old: {},
    },
  },
  { version: 2, stores: { old: null, shelves: { keyPath: 'id' } } },
];

let counter = 0;
const factories: [string, () => Promise<Database>][] = [
  ['memory', async () => memoryDatabase(schema)],
  [
    'IndexedDB',
    async () => {
      globalThis.indexedDB = new IDBFactory();
      return openWebDatabase(`test-${++counter}`, schema);
    },
  ],
];

describe.each(factories)('%s database', (_, create) => {
  let db: Database;
  beforeEach(async () => {
    db = await create();
  });
  afterEach(() => db.close());

  it('stores and reads records by key path and by out-of-line key', async () => {
    await db.put('books', { id: 'a', accession: 1 });
    await db.put('meta', 7, 'nextAccession');
    expect(await db.get('books', 'a')).toEqual({ id: 'a', accession: 1 });
    expect(await db.get('meta', 'nextAccession')).toBe(7);
    expect(await db.get('books', 'missing')).toBeUndefined();
  });

  it('gives auto-increment keys and queries an index', async () => {
    const first = await db.put('loans', { bookId: 'a', toPage: 3 });
    await db.put('loans', { bookId: 'b', toPage: 9 });
    await db.put('loans', { bookId: 'a', toPage: 5 });
    expect(first).toBe(1);
    const loans = await db.getAll<{ id: number; toPage: number }>('loans', {
      index: 'bookId',
      value: 'a',
    });
    expect(loans.map((loan) => [loan.id, loan.toPage])).toEqual([
      [1, 3],
      [3, 5],
    ]);
  });

  it('enforces unique indexes but allows records without the field', async () => {
    await db.put('books', { id: 'a', accession: 1 });
    await db.put('books', { id: 'memory-only' });
    await db.put('books', { id: 'also-memory' });
    await expect(db.put('books', { id: 'b', accession: 1 })).rejects.toThrow();
    expect(await db.getAllKeys('books')).toEqual(['a', 'also-memory', 'memory-only']);
  });

  it('updates a record atomically and deletes it on undefined', async () => {
    const next = () => db.update<number>('meta', 'nextAccession', (current) => (current ?? 1) + 1);
    await Promise.all([next(), next(), next()]);
    expect(await db.get('meta', 'nextAccession')).toBe(4);
    await db.update('meta', 'nextAccession', () => undefined);
    expect(await db.get('meta', 'nextAccession')).toBeUndefined();
  });

  it('applies a batch all or nothing', async () => {
    await db.put('books', { id: 'a', accession: 1 });
    await db.batch([
      { type: 'put', store: 'books', value: { id: 'b', accession: 2 } },
      { type: 'delete', store: 'books', key: 'a' },
    ]);
    expect(await db.getAllKeys('books')).toEqual(['b']);
    await expect(
      db.batch([
        { type: 'put', store: 'books', value: { id: 'c', accession: 3 } },
        { type: 'put', store: 'books', value: { id: 'd', accession: 2 } },
      ]),
    ).rejects.toThrow();
    expect(await db.getAllKeys('books')).toEqual(['b']);
    await db.batch([{ type: 'clear', store: 'books' }]);
    expect(await db.getAll('books')).toEqual([]);
  });

  it('follows the migrations: deleted stores are gone, new ones exist', async () => {
    await db.put('shelves', { id: 's' });
    await expect(db.get('old', 'x')).rejects.toThrow();
  });
});

describe('openWebDatabase', () => {
  it('upgrades an older database step by step, keeping its data', async () => {
    globalThis.indexedDB = new IDBFactory();
    const v1 = await openWebDatabase('upgrade', [schema[0]!]);
    await v1.put('books', { id: 'kept', accession: 1 });
    v1.close();
    const v2 = await openWebDatabase('upgrade', schema);
    expect(await v2.get('books', 'kept')).toEqual({ id: 'kept', accession: 1 });
    await v2.put('shelves', { id: 'new' });
    v2.close();
  });
});

describe('storesOf', () => {
  it('lists the stores left after every migration', () => {
    expect([...storesOf(schema).keys()].sort()).toEqual(['books', 'loans', 'meta', 'shelves']);
  });
});
