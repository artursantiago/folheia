import { memoryDatabase } from '../platform/database';
import { memoryFileStore, type FileStore } from '../platform/files';
import { Copier } from './copies';
import { Library } from './library';
import { librarySchema } from './schema';

const file = new File(['%PDF-1.7 book'], 'saga.pdf');

async function setup(files: FileStore, enabled = true) {
  const db = memoryDatabase(librarySchema);
  const library = new Library(async () => db);
  await library.addToLibrary('a', {
    kind: 'pdf',
    origin: { type: 'file', name: file.name, size: file.size },
    metadata: {},
    pageCount: 3,
  });
  return { library, copier: new Copier(library, files, enabled) };
}

describe('Copier', () => {
  it('stores the file and records it', async () => {
    const files = memoryFileStore();
    const { library, copier } = await setup(files);
    await copier.keep('a', file);
    expect((await files.open('a'))?.size).toBe(file.size);
    expect((await library.get('a'))?.origin).toMatchObject({ copy: { status: 'stored' } });
  });

  it('does not copy the same file twice', async () => {
    const files = memoryFileStore();
    const save = vi.spyOn(files, 'save');
    const { copier } = await setup(files);
    await Promise.all([copier.keep('a', file), copier.keep('a', file)]);
    await copier.keep('a', file);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('records why there is no copy', async () => {
    const full = await setup(memoryFileStore({ fail: 'quota' }));
    await full.copier.keep('a', file);
    expect((await full.library.get('a'))?.origin).toMatchObject({
      copy: { status: 'missing', reason: 'quota' },
    });
    const off = await setup(memoryFileStore(), false);
    await off.copier.keep('a', file);
    expect((await off.library.get('a'))?.origin).toMatchObject({
      copy: { status: 'missing', reason: 'disabled' },
    });
  });
});
