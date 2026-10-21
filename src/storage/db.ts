import { storageName } from '../platform/channel';
import { memoryDatabase, openWebDatabase, type Database } from '../platform/database';
import { opfsFileStore } from '../platform/files';
import { webStorage } from '../platform/storage';
import { Copier } from './copies';
import { Library, migrateLegacyMemory } from './library';
import { librarySchema } from './schema';

export interface LibraryDatabase {
  db: Database;
  /** False when IndexedDB is unavailable (blocked, private mode): nothing outlives the tab. */
  persistent: boolean;
}

let opening: Promise<LibraryDatabase> | undefined;

/**
 * The library database, opened once. Reading must never break because of
 * storage, so a database that won't open falls back to memory.
 */
export function libraryDatabase(): Promise<LibraryDatabase> {
  opening ??= openWebDatabase(storageName, librarySchema).then(
    async (db) => {
      await migrateLegacyMemory(db, webStorage).catch((error: unknown) =>
        console.warn('Could not migrate the old reading memory', error),
      );
      return { db, persistent: true };
    },
    (error: unknown) => {
      console.warn('Library storage unavailable, using memory', error);
      return { db: memoryDatabase(librarySchema), persistent: false };
    },
  );
  return opening;
}

export const library = new Library(async () => (await libraryDatabase()).db);

/** The library's own copies of local files (OPFS on the web). */
export const files = opfsFileStore();

export const copier = new Copier(library, files);
