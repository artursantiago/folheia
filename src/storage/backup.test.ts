import { memoryDatabase } from '../platform/database';
import { applyImport, BackupError, exportLibrary, parseBackup, planImport } from './backup';
import { Library, type LibraryDetails } from './library';
import { librarySchema } from './schema';

const details = (title: string): LibraryDetails => ({
  kind: 'pdf',
  origin: { type: 'file', name: `${title}.pdf`, size: 10, copy: { status: 'stored', storedAt: 1 } },
  metadata: { title },
  pageCount: 50,
});

const newLibrary = () => {
  const db = memoryDatabase(librarySchema);
  return new Library(async () => db);
};

describe('library backup', () => {
  it('exports records with their loans, and imports them into an empty library', async () => {
    const source = newLibrary();
    await source.addToLibrary('a', details('A'));
    await source.saveProgress('a', { fromPage: 1, page: 9, pageCount: 50 }, new Date('2026-10-02'));
    await source.saveProgress('memory', { fromPage: 1, page: 3, pageCount: 5 });
    const backup = parseBackup(JSON.parse(JSON.stringify(await exportLibrary(source))));
    expect(backup).toMatchObject({ format: 'folheia-library', version: 1, nextAccession: 2 });

    const target = newLibrary();
    const plan = await planImport(target, backup);
    expect(plan.added.sort()).toEqual(['a', 'memory']);
    expect(await applyImport(target, plan)).toEqual({ added: 2, updated: 0 });
    const entry = await target.recall('a');
    expect(entry?.record).toMatchObject({ accession: 1, lastPage: 9, metadata: { title: 'A' } });
    // The copy stayed on the other device.
    expect(entry?.record.origin).toEqual({ type: 'file', name: 'A.pdf', size: 10 });
    expect(entry?.loans).toEqual([{ date: '2026-10-02', fromPage: 1, toPage: 9 }]);
    expect((await target.recall('memory'))?.record.accession).toBeUndefined();
    expect((await target.addToLibrary('c', details('C'))).accession).toBe(2);
  });

  it('keeps existing books unless told to overwrite, and joins loan stamps', async () => {
    const source = newLibrary();
    await source.addToLibrary('a', details('A'));
    await source.saveProgress(
      'a',
      { fromPage: 1, page: 40, pageCount: 50 },
      new Date('2026-10-05'),
    );
    const backup = await exportLibrary(source);

    const target = newLibrary();
    await target.addToLibrary('x', details('X'));
    await target.addToLibrary('a', details('A'));
    await target.saveProgress('a', { fromPage: 1, page: 7, pageCount: 50 }, new Date('2026-10-01'));
    const plan = await planImport(target, backup);
    expect(plan.existing).toEqual(['a']);

    expect(await applyImport(target, plan)).toEqual({ added: 0, updated: 0 });
    expect((await target.get('a'))?.lastPage).toBe(7);

    expect(await applyImport(target, plan, { overwrite: true })).toEqual({ added: 0, updated: 1 });
    const entry = await target.recall('a');
    expect(entry?.record).toMatchObject({ lastPage: 40, accession: 2 });
    expect(entry?.record.origin).toMatchObject({ copy: { status: 'stored' } });
    expect(entry?.loans.map((loan) => loan.date)).toEqual(['2026-10-01', '2026-10-05']);
  });

  it('gives a new accession number when the imported one is taken', async () => {
    const source = newLibrary();
    await source.addToLibrary('a', details('A'));
    const target = newLibrary();
    await target.addToLibrary('b', details('B'));
    await applyImport(target, await planImport(target, await exportLibrary(source)));
    expect((await target.get('a'))?.accession).toBe(2);
    expect((await target.addToLibrary('c', details('C'))).accession).toBe(3);
  });

  it('refuses files that are not backups, or come from a newer version', () => {
    expect(() => parseBackup({ books: [] })).toThrow(BackupError);
    expect(() => parseBackup({ format: 'folheia-library', version: 99, books: [] })).toThrow(
      expect.objectContaining({ code: 'newer-version' }),
    );
  });
});
