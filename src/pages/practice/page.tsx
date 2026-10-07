import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SessionResult, SessionSettings } from "@/types";
import { DEFAULT_SESSION_SETTINGS } from "@/types";
import AppHeader from "@/components/AppHeader";
import TypingArea from "@/components/TypingArea";
import ResultsModal from "@/components/ResultsModal";
import { useLibrary } from "@/hooks/useLibrary";
import { buildSessionsForSettings, normalizeContent } from "@/utils/sessions";
import SessionSettingsPanel from "@/components/SessionSettings";

export default function Practice() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { books, lastBookId, loadContent, recordSession, updateBook } = useLibrary();

  const [content, setContent] = useState<string | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initializedRef = useRef<string | null>(null);
  const [readingOffset, setReadingOffset] = useState(0);

  const book = useMemo(
    () => books.find((b) => b.id === bookId) ?? books.find((b) => b.id === lastBookId) ?? null,
    [books, bookId, lastBookId]
  );
  const targetId = book?.id ?? null;

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    loadContent(targetId)
      .then((text) => {
        if (cancelled) return;
        if (!text) {
          setError("Não encontramos o texto deste livro. Importe-o novamente.");
          setContent(null);
        } else {
          setContent(normalizeContent(text));
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Falha ao carregar o texto. Tente novamente.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, loadContent]);

  const settings: SessionSettings = {
    sessionMode: book?.sessionMode ?? DEFAULT_SESSION_SETTINGS.sessionMode,
    wordsPerSession: book?.wordsPerSession ?? DEFAULT_SESSION_SETTINGS.wordsPerSession,
    sentencesPerSession: book?.sentencesPerSession ?? DEFAULT_SESSION_SETTINGS.sentencesPerSession,
    durationMinutes: book?.durationMinutes === undefined ? DEFAULT_SESSION_SETTINGS.durationMinutes : book.durationMinutes,
  };
  const timeMode = settings.sessionMode === "time";
  const sessions = useMemo(() => content ? buildSessionsForSettings(content, settings) : [], [content, settings.sessionMode, settings.wordsPerSession, settings.sentencesPerSession]);

  // resume at the book's saved session, once per book
  useEffect(() => {
    if (!targetId || sessions.length === 0) return;
    if (initializedRef.current === targetId) return;
    initializedRef.current = targetId;
    setSessionIndex(Math.min(book?.currentSession ?? 0, sessions.length - 1));
    setReadingOffset(Math.min(book?.readingOffset ?? 0, content?.length ?? 0));
  }, [targetId, sessions.length, book?.currentSession, book?.readingOffset, content]);

  const safeIndex = Math.min(sessionIndex, Math.max(sessions.length - 1, 0));
  const sessionText = timeMode ? (content?.slice(readingOffset, readingOffset + 6000) ?? "") : sessions[safeIndex] ?? "";

  const handleComplete = useCallback(
    (sessionResult: SessionResult) => {
      setResult(sessionResult);
      if (targetId) {
        recordSession(targetId, safeIndex, sessionResult);
        if (timeMode && content) {
          const consumed = sessionResult.consumedCharacters ?? sessionResult.cursorCharacters ?? 0;
          const next = Math.min(content.length, readingOffset + consumed);
          setReadingOffset(next);
          updateBook(targetId, { readingOffset: next, contentLength: content.length, progress: Math.round((next / content.length) * 100), ...settings });
        }
      }
    },
    [targetId, safeIndex, recordSession, timeMode, content, readingOffset, updateBook, settings]
  );

  const goToLibrary = () => navigate("/");

  const hasNext = timeMode ? readingOffset < (content?.length ?? 0) : safeIndex < sessions.length - 1;

  const handleNext = () => {
    setResult(null);
    setSessionIndex((i) => Math.min(i + 1, sessions.length - 1));
  };

  return (
    <div className="min-h-screen bg-[#0b1118] text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={goToLibrary}
              className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-lime-300"
            >
              <i className="ri-arrow-left-line text-sm"></i>
              minha estante
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300">
              modo prática
            </div>
            <h1 className="mt-2 font-serif text-3xl text-white">
              {book ? book.title : "Praticar"}
            </h1>
            {book && (
              <p className="mt-1 text-xs text-slate-500">
                {book.author} · {timeMode ? "leitura por tempo" : `sessão ${safeIndex + 1} de ${Math.max(sessions.length, 1)}`}
              </p>
            )}
          </div>
          {book && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-lime-300"></div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {book.progress}% do livro
              </span>
            </div>
          )}
        </div>

        {book && !loading && <SessionSettingsPanel value={settings} onChange={(next) => {
          const nextSessions = content ? buildSessionsForSettings(content, next) : [];
          updateBook(book.id, { ...next, readingOffset, totalSessions: next.sessionMode === "time" ? 0 : nextSessions.length, currentSession: 0, completedSessions: 0, completedSessionIndexes: [] });
          setSessionIndex(0); setResult(null);
        }} />}

        {loading && (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/[0.08] bg-[#111c28] py-20 text-center">
            <i className="ri-loader-4-line animate-spin text-2xl text-lime-300"></i>
            <p className="mt-4 text-sm text-slate-400">Carregando o texto do livro…</p>
          </div>
        )}

        {!loading && (error || !book || sessionText.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/[0.08] bg-[#111c28] py-20 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
              <i className="ri-error-warning-line text-xl"></i>
            </div>
            <p className="max-w-sm text-sm text-slate-400">
              {error || "Este livro ainda não tem texto disponível para prática."}
            </p>
            <button
              type="button"
              onClick={goToLibrary}
              className="mt-5 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-200"
            >
              voltar à estante
            </button>
          </div>
        )}

        {!loading && !error && book && sessionText.length > 0 && (
          <TypingArea
            key={`${targetId}-${safeIndex}-${readingOffset}`}
            text={sessionText}
            timed={timeMode}
            durationMinutes={settings.durationMinutes}
            onComplete={handleComplete}
          />
        )}
      </main>

      {result && (
        <ResultsModal
          result={result}
          hasNext={hasNext}
          sessionNumber={safeIndex + 1}
          totalSessions={Math.max(sessions.length, 1)}
          onNext={handleNext}
          onClose={goToLibrary}
        />
      )}
    </div>
  );
}
