import { openDB, type IDBPDatabase } from 'idb';

/**
 * Asynchronous document storage for the library. The web build uses
 * IndexedDB; a native build can swap in SQLite or the WebView's own storage
 * behind the same interface. Tests use the in-memory fake.
 */
export interface Database {
  get<T>(store: string, key: IDBValidKey): Promise<T | undefined>;
  /** Every record, or those whose `index` equals `value`. */
  getAll<T>(store: string, query?: IndexQuery): Promise<T[]>;
  getAllKeys(store: string): Promise<IDBValidKey[]>;
  /** Stores a record; `key` only for stores without a key path. Returns its key. */
  put<T>(store: string, value: T, key?: IDBValidKey): Promise<IDBValidKey>;
  delete(store: string, key: IDBValidKey): Promise<void>;
  /**
   * Reads, changes and writes one record atomically (counters, merges).
   * `change` must be synchronous; returning undefined deletes the record.
   */
  update<T>(
    store: string,
    key: IDBValidKey,
    change: (current: T | undefined) => T | undefined,
  ): Promise<T | undefined>;
  /** Several writes across stores, all or nothing. */
  batch(operations: readonly WriteOperation[]): Promise<void>;
  close(): void;
}

export interface IndexQuery {
  index: string;
  value: IDBValidKey;
}

export type WriteOperation =
  | { type: 'put'; store: string; value: unknown; key?: IDBValidKey }
  | { type: 'delete'; store: string; key: IDBValidKey }
  | { type: 'clear'; store: string };

export interface StoreSchema {
  /** In-line key; without it, keys are given to `put`. */
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: Record<string, { keyPath: string; unique?: boolean }>;
}

/**
 * Numbered migrations: version N creates the stores listed under N. A store
 * is never changed in place; a later version can delete it (`null`).
 */
export type Schema = readonly { version: number; stores: Record<string, StoreSchema | null> }[];

/** The stores that exist after every migration. */
export function storesOf(schema: Schema): Map<string, StoreSchema> {
  const stores = new Map<string, StoreSchema>();
  for (const step of [...schema].sort((a, b) => a.version - b.version))
    for (const [name, definition] of Object.entries(step.stores)) {
      if (definition) stores.set(name, definition);
      else stores.delete(name);
    }
  return stores;
}

function latestVersion(schema: Schema) {
  return Math.max(...schema.map((step) => step.version));
}

/** IndexedDB, created and upgraded from `schema`. */
export async function openWebDatabase(name: string, schema: Schema): Promise<Database> {
  let db: IDBPDatabase | undefined;
  const open = () =>
    openDB(name, latestVersion(schema), {
      upgrade(database, oldVersion) {
        for (const step of [...schema].sort((a, b) => a.version - b.version)) {
          if (step.version <= oldVersion) continue;
          for (const [store, definition] of Object.entries(step.stores)) {
            if (database.objectStoreNames.contains(store)) database.deleteObjectStore(store);
            if (!definition) continue;
            const created = database.createObjectStore(store, {
              ...(definition.keyPath ? { keyPath: definition.keyPath } : {}),
              autoIncrement: definition.autoIncrement ?? false,
            });
            for (const [index, { keyPath, unique }] of Object.entries(definition.indexes ?? {}))
              created.createIndex(index, keyPath, { unique: unique ?? false });
          }
        }
      },
      // Another tab (a newer version of the app) wants to upgrade: let it.
      blocking() {
        db?.close();
        db = undefined;
      },
      terminated() {
        db = undefined;
      },
    });
  db = await open();
  const connection = async () => (db ??= await open());

  return {
    async get(store, key) {
      return (await connection()).get(store, key);
    },
    async getAll(store, query) {
      const database = await connection();
      return query
        ? database.getAllFromIndex(store, query.index, query.value)
        : database.getAll(store);
    },
    async getAllKeys(store) {
      return (await connection()).getAllKeys(store);
    },
    async put(store, value, key) {
      return (await connection()).put(store, value, key);
    },
    async delete(store, key) {
      await (await connection()).delete(store, key);
    },
    async update<T>(
      store: string,
      key: IDBValidKey,
      change: (current: T | undefined) => T | undefined,
    ) {
      const tx = (await connection()).transaction(store, 'readwrite');
      const objects = tx.objectStore(store);
      const next = change((await objects.get(key)) as T | undefined);
      const inline = objects.keyPath !== null;
      if (next === undefined) await objects.delete(key);
      else await objects.put(next, inline ? undefined : key);
      await tx.done;
      return next;
    },
    async batch(operations) {
      if (operations.length === 0) return;
      const names = [...new Set(operations.map((operation) => operation.store))];
      const tx = (await connection()).transaction(names, 'readwrite');
      // Queue every request before awaiting, so the transaction stays open.
      const requests = operations.map((operation) => {
        const objects = tx.objectStore(operation.store);
        if (operation.type === 'put') return objects.put(operation.value, operation.key);
        if (operation.type === 'delete') return objects.delete(operation.key);
        return objects.clear();
      });
      await Promise.all([...requests, tx.done]);
    },
    close() {
      db?.close();
      db = undefined;
    },
  };
}

function clone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    // Some test environments can't clone a Blob; the value is still usable.
    return value;
  }
}

function keyOf(definition: StoreSchema, value: unknown): IDBValidKey | undefined {
  if (!definition.keyPath) return undefined;
  return (value as Record<string, IDBValidKey | undefined>)[definition.keyPath];
}

/** Compares keys the way IndexedDB orders them, for numbers and strings. */
function compareKeys(a: IDBValidKey, b: IDBValidKey) {
  if (typeof a === typeof b) return a < b ? -1 : a > b ? 1 : 0;
  return typeof a === 'number' ? -1 : 1;
}

/** In memory, with the same key paths, auto-increment and indexes. For tests. */
export function memoryDatabase(schema: Schema): Database {
  const definitions = storesOf(schema);
  const data = new Map<string, Map<IDBValidKey, unknown>>();
  const counters = new Map<string, number>();
  const storeOf = (name: string) => {
    if (!definitions.has(name)) throw new DOMException(`No store ${name}`, 'NotFoundError');
    let store = data.get(name);
    if (!store) data.set(name, (store = new Map()));
    return store;
  };
  const sorted = (store: Map<IDBValidKey, unknown>) =>
    [...store.entries()].sort(([a], [b]) => compareKeys(a, b));

  function put(name: string, value: unknown, key?: IDBValidKey): IDBValidKey {
    const definition = definitions.get(name)!;
    const store = storeOf(name);
    let id = keyOf(definition, value) ?? key;
    if (id === undefined && definition.autoIncrement) {
      id = (counters.get(name) ?? 0) + 1;
      if (definition.keyPath) value = { ...(value as object), [definition.keyPath]: id };
    }
    if (id === undefined) throw new DOMException('Missing key', 'DataError');
    if (typeof id === 'number') counters.set(name, Math.max(counters.get(name) ?? 0, id));
    for (const [index, { keyPath, unique }] of Object.entries(definition.indexes ?? {})) {
      const indexed = (value as Record<string, unknown>)[keyPath];
      if (!unique || indexed === undefined) continue;
      for (const [otherKey, other] of store)
        if (otherKey !== id && (other as Record<string, unknown>)[keyPath] === indexed)
          throw new DOMException(`Index ${index} must be unique`, 'ConstraintError');
    }
    store.set(id, clone(value));
    return id;
  }

  return {
    async get<T>(name: string, key: IDBValidKey) {
      return clone(storeOf(name).get(key)) as T | undefined;
    },
    async getAll<T>(name: string, query?: IndexQuery) {
      const definition = definitions.get(name)!;
      const keyPath = query ? definition.indexes?.[query.index]?.keyPath : undefined;
      if (query && !keyPath) throw new DOMException(`No index ${query.index}`, 'NotFoundError');
      return sorted(storeOf(name))
        .map(([, value]) => value)
        .filter((value) => !keyPath || (value as Record<string, unknown>)[keyPath] === query!.value)
        .map((value) => clone(value) as T);
    },
    async getAllKeys(name) {
      return sorted(storeOf(name)).map(([key]) => key);
    },
    async put(name, value, key) {
      return put(name, value, key);
    },
    async delete(name, key) {
      storeOf(name).delete(key);
    },
    async update<T>(
      name: string,
      key: IDBValidKey,
      change: (current: T | undefined) => T | undefined,
    ) {
      const next = change(clone(storeOf(name).get(key)) as T | undefined);
      if (next === undefined) storeOf(name).delete(key);
      else put(name, next, definitions.get(name)!.keyPath ? undefined : key);
      return next;
    },
    async batch(operations) {
      // All or nothing: work on copies, then swap them in.
      const backup = new Map([...data].map(([name, store]) => [name, new Map(store)]));
      const counterBackup = new Map(counters);
      try {
        for (const operation of operations) {
          if (operation.type === 'put') put(operation.store, operation.value, operation.key);
          else if (operation.type === 'delete') storeOf(operation.store).delete(operation.key);
          else storeOf(operation.store).clear();
        }
      } catch (error) {
        data.clear();
        for (const [name, store] of backup) data.set(name, store);
        counters.clear();
        for (const [name, value] of counterBackup) counters.set(name, value);
        throw error;
      }
    },
    close() {},
  };
}
