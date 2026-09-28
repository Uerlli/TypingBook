import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SessionResult } from "@/types";
import AppHeader from "@/components/AppHeader";
import TypingArea from "@/components/TypingArea";
import ResultsModal from "@/components/ResultsModal";
import { useLibrary } from "@/hooks/useLibrary";
import { buildSessions } from "@/utils/sessions";

export default function Practice() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { books, lastBookId, loadContent, recordSession } = useLibrary();

  const [content, setContent] = useState<string | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initializedRef = useRef<string | null>(null);

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
          setContent(text);
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

  const sessions = useMemo(() => (content ? buildSessions(content) : []), [content]);

  // resume at the book's saved session, once per book
  useEffect(() => {
    if (!targetId || sessions.length === 0) return;
    if (initializedRef.current === targetId) return;
    initializedRef.current = targetId;
    setSessionIndex(Math.min(book?.currentSession ?? 0, sessions.length - 1));
  }, [targetId, sessions.length, book?.currentSession]);

  const safeIndex = Math.min(sessionIndex, Math.max(sessions.length - 1, 0));

  const handleComplete = useCallback(
    (sessionResult: SessionResult) => {
      setResult(sessionResult);
      if (targetId) recordSession(targetId, safeIndex, sessionResult);
    },
    [targetId, safeIndex, recordSession]
  );

  const goToLibrary = () => navigate("/");

  const hasNext = safeIndex < sessions.length - 1;

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
                {book.author} · sessão {safeIndex + 1} de {Math.max(sessions.length, 1)}
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

        {loading && (
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/[0.08] bg-[#111c28] py-20 text-center">
            <i className="ri-loader-4-line animate-spin text-2xl text-lime-300"></i>
            <p className="mt-4 text-sm text-slate-400">Carregando o texto do livro…</p>
          </div>
        )}

        {!loading && (error || !book || sessions.length === 0) && (
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

        {!loading && !error && book && sessions.length > 0 && (
          <TypingArea
            key={`${targetId}-${safeIndex}`}
            text={sessions[safeIndex]}
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