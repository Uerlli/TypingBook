/**
 * Safe localStorage helpers.
 *
 * Every read/write is wrapped in try/catch so a QuotaExceededError (large
 * documents, disabled storage, private mode) never crashes the app. When a
 * write fails we emit a `typingbook:storage-error` event that the UI listens
 * to in order to show a friendly toast.
 */

export const STORAGE_KEYS = {
  books: "typingbook.books.v1",
  settings: "typingbook.settings.v1",
  theme: "typingbook.theme.v1",
  lastBookId: "typingbook.lastBookId.v1",
} as const;

export const STORAGE_ERROR_EVENT = "typingbook:storage-error";

export const QUOTA_MESSAGE =
  "Não foi possível salvar localmente. Considere remover livros antigos.";

export class StorageQuotaError extends Error {
  constructor(message: string = QUOTA_MESSAGE) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; code?: number };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

function emitStorageError(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(STORAGE_ERROR_EVENT, { detail: { message } })
  );
}

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @returns true when the value was persisted, false when it failed (quota).
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    const message = isQuotaError(error)
      ? QUOTA_MESSAGE
      : "Não foi possível salvar localmente. Considere remover livros antigos.";
    emitStorageError(message);
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    emitStorageError(QUOTA_MESSAGE);
    return false;
  }
}