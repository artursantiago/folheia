import { storageName } from '../platform/channel';
import { memoryDatabase, openWebDatabase, type Database } from '../platform/database';
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
    (db) => ({ db, persistent: true }),
    (error: unknown) => {
      console.warn('Library storage unavailable, using memory', error);
      return { db: memoryDatabase(librarySchema), persistent: false };
    },
  );
  return opening;
}
