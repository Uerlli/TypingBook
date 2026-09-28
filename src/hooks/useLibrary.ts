import { useCallback, useEffect, useRef, useState } from "react";
import type { BookMeta, SessionResult } from "@/types";
import { demoBooks } from "@/mocks/demoBooks";
import {
  deleteBookContent,
  getBookContent,
  saveBookData,
} from "@/utils/bookStorage";
import {
  STORAGE_KEYS,
  safeGetItem,
  safeGetJSON,
  safeSetItem,
  safeSetJSON,
} from "@/utils/localStore";

export interface AddBookInput {
  meta: BookMeta;
  rawContent: string;
  filteredContent: string;
}

/**
 * Owns the library: lightweight metadata in state/localStorage, heavy text in
 * IndexedDB. This is what keeps large documents from blowing past the ~5MB
 * localStorage quota.
 */
export function useLibrary() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [lastBookId, setLastBookId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const booksRef = useRef<BookMeta[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    let cancelled = false;
    const stored = safeGetJSON<BookMeta[]>(STORAGE_KEYS.books, []);
    const last = safeGetItem(STORAGE_KEYS.lastBookId);

    if (stored && stored.length) {
      if (cancelled) return;
      setBooks(stored);
      setLastBookId(last && stored.some((b) => b.id === last) ? last : stored[0].id);
    } else if (!seeded.current) {
      seeded.current = true;
      const metas = demoBooks.map((d) => d.meta);
      if (cancelled) return;
      setBooks(metas);
      setLastBookId(metas[0]?.id ?? null);
      demoBooks.forEach((d) => {
        void saveBookData(d.meta.id, {
          content: d.content,
          filteredContent: d.filteredContent,
        });
      });
    }
    setReady(true);
    return () => {
      cancelled = true;
    };
  }, []);

  // persist light metadata only (never the full text)
  useEffect(() => {
    if (ready) safeSetJSON(STORAGE_KEYS.books, books);
  }, [books, ready]);

  useEffect(() => {
    if (ready && lastBookId) safeSetItem(STORAGE_KEYS.lastBookId, lastBookId);
  }, [lastBookId, ready]);

  const addBook = useCallback(async ({ meta, rawContent, filteredContent }: AddBookInput) => {
    await saveBookData(meta.id, { content: rawContent, filteredContent });
    setBooks((prev) => [meta, ...prev.filter((b) => b.id !== meta.id)]);
    setLastBookId(meta.id);
    return meta;
  }, []);

  const removeBook = useCallback(async (id: string) => {
    await deleteBookContent(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setLastBookId((current) => {
      if (current !== id) return current;
      const remaining = booksRef.current.filter((b) => b.id !== id);
      return remaining[0]?.id ?? null;
    });
  }, []);

  const updateBook = useCallback((id: string, patch: Partial<BookMeta>) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const loadContent = useCallback((id: string) => getBookContent(id), []);

  const recordSession = useCallback(
    (id: string, sessionIndex: number, result: SessionResult) => {
      setBooks((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;

          // Sessions already completed (repeats don't grow this set).
          const done =
            b.completedSessionIndexes && b.completedSessionIndexes.length
              ? [...b.completedSessionIndexes].sort((x, y) => x - y)
              : Array.from({ length: Math.max(0, b.completedSessions) }, (_, i) => i);

          const isRepeat = done.includes(sessionIndex);
          const nextDone = isRepeat
            ? done
            : [...done, sessionIndex].sort((x, y) => x - y);

          const completedSessions = nextDone.length;
          const totalSessions = Math.max(
            b.totalSessions,
            completedSessions,
            sessionIndex + 1
          );

          // Running average over every attempt, repeats included.
          const attempts = (b.attempts ?? Math.max(1, b.completedSessions)) + 1;
          const avgWpm =
            b.avgWpm > 0
              ? Math.round((b.avgWpm * (attempts - 1) + result.wpm) / attempts)
              : result.wpm;

          // Resume at the first session still missing.
          let currentSession = totalSessions - 1;
          for (let i = 0; i < totalSessions; i += 1) {
            if (!nextDone.includes(i)) {
              currentSession = i;
              break;
            }
          }

          const progress =
            totalSessions > 0
              ? Math.min(100, Math.round((completedSessions / totalSessions) * 100))
              : 0;

          return {
            ...b,
            completedSessionIndexes: nextDone,
            completedSessions,
            totalSessions,
            attempts,
            avgWpm,
            progress,
            currentSession,
            lastRead: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  return {
    books,
    lastBookId,
    ready,
    setLastBookId,
    addBook,
    removeBook,
    updateBook,
    loadContent,
    recordSession,
  };
}