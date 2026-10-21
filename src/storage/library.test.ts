import { memoryDatabase, type Database } from '../platform/database';
import { memoryStorage } from '../platform/storage';
import { LEGACY_KEY, Library, migrateLegacyMemory, type LibraryDetails } from './library';
import { librarySchema } from './schema';

const details: LibraryDetails = {
  kind: 'pdf',
  origin: { type: 'file', name: 'saga.pdf', size: 1000 },
  metadata: { title: 'Saga' },
  pageCount: 120,
};

describe('Library', () => {
  let db: Database;
  let library: Library;
  beforeEach(() => {
    db = memoryDatabase(librarySchema);
    library = new Library(async () => db);
  });

  it('remembers the last page and stamps one loan per day', async () => {
    await library.saveProgress(
      'a',
      { fromPage: 1, page: 10, pageCount: 80 },
      new Date('2026-10-02T10:00:00Z'),
    );
    await library.saveProgress(
      'a',
      { fromPage: 1, page: 34, pageCount: 80 },
      new Date('2026-10-02T11:00:00Z'),
    );
    await library.saveProgress(
      'a',
      { fromPage: 34, page: 61, pageCount: 80 },
      new Date('2026-10-11T10:00:00Z'),
    );
    const entry = await library.recall('a');
    expect(entry?.record).toMatchObject({ id: 'a', lastPage: 61, pageCount: 80 });
    expect(entry?.record.accession).toBeUndefined();
    expect(entry?.loans).toEqual([
      { date: '2026-10-02', fromPage: 1, toPage: 34 },
      { date: '2026-10-11', fromPage: 34, toPage: 61 },
    ]);
  });

  it('marks the book read when the last page is reached', async () => {
    const day = new Date('2026-10-02T10:00:00Z');
    await library.saveProgress('a', { fromPage: 1, page: 79, pageCount: 80 }, day);
    expect((await library.get('a'))?.finishedAt).toBeUndefined();
    await library.saveProgress('a', { fromPage: 1, page: 80, pageCount: 80 }, day);
    expect((await library.get('a'))?.finishedAt).toBe(day.getTime());
    await library.saveProgress('a', { fromPage: 1, page: 3, pageCount: 80 }, new Date());
    expect((await library.get('a'))?.finishedAt).toBe(day.getTime());
  });

  it('gives sequential accession numbers and keeps them when a book comes back', async () => {
    const a = await library.addToLibrary('a', details);
    const b = await library.addToLibrary('b', { ...details, metadata: { title: 'B' } });
    const again = await library.addToLibrary('a', { ...details, metadata: { title: 'Saga 2' } });
    expect([a.accession, b.accession, again.accession]).toEqual([1, 2, 1]);
    expect(again.metadata?.title).toBe('Saga 2');
    expect(again.addedAt).toBe(a.addedAt);
  });

  it('keeps progress memory when the book enters the library', async () => {
    await library.saveProgress('a', { fromPage: 1, page: 42, pageCount: 120 });
    await library.update('a', { direction: 'rtl' });
    const record = await library.addToLibrary('a', details);
    expect(record).toMatchObject({ lastPage: 42, direction: 'rtl', accession: 1 });
  });

  it('keeps a known file copy when the same file is added again', async () => {
    await library.addToLibrary('a', {
      ...details,
      origin: {
        type: 'file',
        name: 'saga.pdf',
        size: 1000,
        copy: { status: 'stored', storedAt: 5 },
      },
    });
    const record = await library.addToLibrary('a', details);
    expect(record.origin).toEqual({
      type: 'file',
      name: 'saga.pdf',
      size: 1000,
      copy: { status: 'stored', storedAt: 5 },
    });
  });

  it('moves memory kept under a legacy id to the new one', async () => {
    await library.saveProgress('cbz:old.cbz:10:1', { fromPage: 1, page: 7, pageCount: 20 });
    const entry = await library.recall('cbz:hash', ['cbz:old.cbz:10:1']);
    expect(entry?.record).toMatchObject({ id: 'cbz:hash', lastPage: 7 });
    expect(entry?.loans).toHaveLength(1);
    expect(await library.get('cbz:old.cbz:10:1')).toBeUndefined();
    expect(await library.loans('cbz:hash')).toHaveLength(1);
  });

  it('stores a cover', async () => {
    await library.setCover('a', new Blob(['jpeg']));
    expect(await library.cover('a')).toBeDefined();
    expect(await library.cover('b')).toBeUndefined();
  });
});

describe('migrateLegacyMemory', () => {
  it('turns the localStorage books into progress memory, then drops the key', async () => {
    const db = memoryDatabase(librarySchema);
    const storage = memoryStorage();
    storage.set(
      LEGACY_KEY,
      JSON.stringify({
        'pdf:abc': {
          lastPage: 61,
          direction: 'rtl',
          touched: 5,
          history: [
            { date: '2026-10-02', fromPage: 1, toPage: 34 },
            { date: '2026-10-11', fromPage: 34, toPage: 61 },
          ],
        },
        'cbz:a.cbz:10:1': { lastPage: 3, history: [], touched: 6 },
      }),
    );
    await migrateLegacyMemory(db, storage);
    const library = new Library(async () => db);
    const entry = await library.recall('pdf:abc');
    expect(entry?.record).toEqual({
      id: 'pdf:abc',
      lastPage: 61,
      direction: 'rtl',
      readAt: 5,
      updatedAt: 5,
    });
    expect(entry?.loans).toHaveLength(2);
    expect((await library.recall('cbz:new', ['cbz:a.cbz:10:1']))?.record.lastPage).toBe(3);
    expect(storage.get(LEGACY_KEY)).toBeNull();
  });

  it('keeps the key when the database fails, and never overwrites newer data', async () => {
    const db = memoryDatabase(librarySchema);
    const storage = memoryStorage();
    await new Library(async () => db).saveProgress('pdf:abc', {
      fromPage: 1,
      page: 90,
      pageCount: 99,
    });
    storage.set(LEGACY_KEY, JSON.stringify({ 'pdf:abc': { lastPage: 2, history: [] } }));
    await migrateLegacyMemory(db, storage);
    expect((await db.get<{ lastPage: number }>('books', 'pdf:abc'))?.lastPage).toBe(90);

    storage.set(LEGACY_KEY, JSON.stringify({ x: { lastPage: 2 } }));
    const failing = { ...db, batch: () => Promise.reject(new Error('quota')) };
    await expect(migrateLegacyMemory(failing, storage)).rejects.toThrow('quota');
    expect(storage.get(LEGACY_KEY)).not.toBeNull();
  });

  it('drops an unreadable key', async () => {
    const storage = memoryStorage();
    storage.set(LEGACY_KEY, '{oops');
    await migrateLegacyMemory(memoryDatabase(librarySchema), storage);
    expect(storage.get(LEGACY_KEY)).toBeNull();
  });
});
