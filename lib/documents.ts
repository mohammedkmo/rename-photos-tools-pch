"use client";

export type DocumentKind = "personal" | "vehicles";

/** Everything the applications list needs, without loading the photos. */
export interface DocumentMeta {
  id: string;
  kind: DocumentKind;
  name: string;
  createdAt: string;
  updatedAt: string;
  contractor: string;
  rowCount: number;
  photoCount: number;
}

const DB_NAME = "hfyc";
const DB_VERSION = 1;
const META_STORE = "documentMeta";
const DATA_STORE = "documentData";

// No I/O/0/1 so a code read off a screen cannot be mistyped.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomCode = (length = 4) => {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
};

export const newDocumentId = () => `${Date.now().toString(36)}-${randomCode(6).toLowerCase()}`;

/** e.g. "PB-7K3M" for personal, "VB-Q92X" for vehicles. */
export const newDocumentName = (kind: DocumentKind) =>
  `${kind === "personal" ? "PB" : "VB"}-${randomCode()}`;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const run = <T>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> =>
  openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = action(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );

export const listDocuments = async (): Promise<DocumentMeta[]> => {
  try {
    const all = await run<DocumentMeta[]>(META_STORE, "readonly", (store) => store.getAll());
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
};

export const readDocument = async (id: string) => {
  try {
    const [meta, values] = await Promise.all([
      run<DocumentMeta | undefined>(META_STORE, "readonly", (store) => store.get(id)),
      run<unknown>(DATA_STORE, "readonly", (store) => store.get(id)),
    ]);
    return meta ? { meta, values } : null;
  } catch {
    return null;
  }
};

export type WriteOutcome = "saved" | "saved-without-files" | "failed";

/**
 * Photos are stored alongside the text because IndexedDB takes File objects
 * directly, which is what makes reopening an application actually useful. If a
 * batch is large enough to blow the storage quota we keep the text rather than
 * losing the lot, and say so.
 */
export const writeDocument = async (
  meta: DocumentMeta,
  values: unknown
): Promise<WriteOutcome> => {
  try {
    await run(META_STORE, "readwrite", (store) => store.put(meta));
    await run(DATA_STORE, "readwrite", (store) => store.put(values, meta.id));
    return "saved";
  } catch {
    try {
      await run(DATA_STORE, "readwrite", (store) => store.put(stripFiles(values), meta.id));
      return "saved-without-files";
    } catch {
      return "failed";
    }
  }
};

export const deleteDocument = async (id: string) => {
  try {
    await run(META_STORE, "readwrite", (store) => store.delete(id));
    await run(DATA_STORE, "readwrite", (store) => store.delete(id));
  } catch {
    // Nothing useful to do if the delete fails; the list will still show it.
  }
};

export const renameDocument = async (id: string, name: string) => {
  const meta = await run<DocumentMeta | undefined>(META_STORE, "readonly", (store) => store.get(id));
  if (!meta) return;
  await run(META_STORE, "readwrite", (store) => store.put({ ...meta, name }));
};

const stripFiles = (value: unknown): unknown => {
  if (value instanceof File || value instanceof Blob) return undefined;
  if (Array.isArray(value)) return value.map(stripFiles);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, stripFiles(entry)] as const)
        .filter(([, entry]) => entry !== undefined)
    );
  }
  return value;
};
