/**
 * IndexedDB layer for heavy book content.
 *
 * localStorage keeps only lightweight metadata (see `BookMeta`). The full raw
 * text of each imported document — and, after Part 2, the filtered/classified
 * version used to build typing sessions — lives here in a dedicated object
 * store keyed by the book id. IndexedDB has no ~5MB limit, so full novels and
 * 800+ page PDFs no longer blow up the app.
 */

const DB_NAME = "typingbook-content";
const DB_VERSION = 1;
const STORE = "bookContent";

export interface BookContentRecord {
  id: string;
  /** Raw text exactly as extracted from the file. */
  content: string;
  /** Text kept after the block-review step (what sessions are built from). */
  filteredContent: string;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openBookDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível neste navegador."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Falha ao abrir o IndexedDB."));
  });

  // If opening fails, allow a retry on the next call.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

type TxMode = "readonly" | "readwrite";

function tx(db: IDBDatabase, mode: TxMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Erro de operação no IndexedDB."));
  });
}

/** Save the raw text for a book. */
export async function saveBookContent(
  id: string,
  content: string
): Promise<void> {
  const db = await openBookDB();
  const store = tx(db, "readwrite");
  const existing = (await wrapRequest<BookContentRecord | undefined>(
    store.get(id)
  )) as BookContentRecord | undefined;

  const record: BookContentRecord = {
    id,
    content,
    filteredContent: existing?.filteredContent ?? "",
    updatedAt: Date.now(),
  };

  await wrapRequest(tx(db, "readwrite").put(record));
}

/** Save the filtered/classified text kept after the review step. */
export async function saveFilteredContent(
  id: string,
  filteredContent: string
): Promise<void> {
  const db = await openBookDB();
  const store = tx(db, "readwrite");
  const existing = (await wrapRequest<BookContentRecord | undefined>(
    store.get(id)
  )) as BookContentRecord | undefined;

  const record: BookContentRecord = {
    id,
    content: existing?.content ?? "",
    filteredContent,
    updatedAt: Date.now(),
  };

  await wrapRequest(tx(db, "readwrite").put(record));
}

/** Persist raw + filtered text in a single write. */
export async function saveBookData(
  id: string,
  data: { content: string; filteredContent?: string }
): Promise<void> {
  const db = await openBookDB();
  const record: BookContentRecord = {
    id,
    content: data.content,
    filteredContent: data.filteredContent ?? "",
    updatedAt: Date.now(),
  };
  await wrapRequest(tx(db, "readwrite").put(record));
}

/** The text used to build typing sessions (filtered, falls back to raw). */
export async function getBookContent(id: string): Promise<string | null> {
  const record = await getBookData(id);
  if (!record) return null;
  return record.filteredContent || record.content;
}

export async function getBookData(
  id: string
): Promise<BookContentRecord | null> {
  try {
    const db = await openBookDB();
    const store = tx(db, "readonly");
    const record = (await wrapRequest<BookContentRecord | undefined>(
      store.get(id)
    )) as BookContentRecord | undefined;
    return record ?? null;
  } catch {
    return null;
  }
}

export async function deleteBookContent(id: string): Promise<void> {
  try {
    const db = await openBookDB();
    await wrapRequest(tx(db, "readwrite").delete(id));
  } catch {
    /* ignore */
  }
}

/** Load several books at once (used on startup for the library). */
export async function getBookContents(
  ids: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      const record = await getBookData(id);
      if (record) result[id] = record.filteredContent || record.content;
    })
  );
  return result;
}