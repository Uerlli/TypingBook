import { useMemo, useState } from "react";
import type { BookMeta } from "@/types";
import BookSpine from "@/components/BookSpine";
import StatsCards from "@/components/StatsCards";
import { formatNumber } from "@/utils/sessions";

interface DashboardProps {
  books: BookMeta[];
  lastBookId: string | null;
  onImport: () => void;
  onOpenBook: (id: string) => void;
  onRemoveBook: (id: string) => void;
}

const FORMAT_LABEL: Record<string, string> = { pdf: "PDF", epub: "EPUB", txt: "TXT" };

export default function Dashboard({
  books,
  lastBookId,
  onImport,
  onOpenBook,
  onRemoveBook,
}: DashboardProps) {
  const [menuId, setMenuId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalWords = books.reduce((sum, b) => sum + b.wordCount, 0);
    const completedSessions = books.reduce((sum, b) => sum + b.completedSessions, 0);
    const rated = books.filter((b) => b.avgWpm > 0);
    const avgWpm = rated.length
      ? Math.round(rated.reduce((sum, b) => sum + b.avgWpm, 0) / rated.length)
      : 0;
    return { totalWords, completedSessions, avgWpm };
  }, [books]);

  const resume = books.find((b) => b.id === lastBookId) ?? books[0] ?? null;

  return (
    <main className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="tb-anim-fade relative min-h-[340px] overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#18252d] p-7 sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-2/3 bg-[radial-gradient(ellipse_at_bottom_right,rgba(190,242,100,0.16),transparent_65%)]" />
          <div className="relative max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200">
              seu espaço de foco
            </div>
            <h1 className="max-w-lg font-serif text-4xl leading-[1.05] text-white sm:text-5xl">
              Leia mais.
              <br />
              <em className="text-lime-300">Digite melhor.</em>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Transforme qualquer livro em uma prática de digitação que você realmente quer
              continuar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onImport}
                className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-lime-200"
              >
                <i className="ri-file-add-line text-base"></i>
                importar livro
              </button>
              <button
                type="button"
                onClick={() =>
                  document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                <i className="ri-stack-line text-base"></i>
                explorar clássicos
              </button>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-6 right-7 hidden font-mono text-[11px] uppercase tracking-[0.25em] text-white/20 sm:block">
            typing / reading / repeating
          </div>
        </div>

        <div className="tb-anim-fade rounded-[32px] border border-white/[0.08] bg-[#111c28] p-6 sm:p-7">
          {resume ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    retomar de onde parou
                  </div>
                  <h2 className="mt-2 font-serif text-2xl text-white">{resume.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenBook(resume.id)}
                  className="rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-lime-300"
                  aria-label="Continuar livro"
                >
                  <i className="ri-arrow-right-up-line text-base"></i>
                </button>
              </div>
              <div className="group mt-7 flex items-end gap-4">
                <BookSpine title={resume.title} color={resume.coverColor} size="lg" />
                <div>
                  <div className="text-sm text-slate-400">{resume.author}</div>
                  <div className="mt-3 font-mono text-3xl text-white">{resume.progress}%</div>
                  <div className="text-xs text-slate-500">progresso do livro</div>
                </div>
              </div>
              <div className="mt-7">
                <div className="mb-2 flex justify-between text-xs text-slate-500">
                  <span>{resume.completedSessions} sessões concluídas</span>
                  <span className="font-mono text-lime-200">{resume.avgWpm} WPM médio</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-lime-300 transition-all"
                    style={{ width: `${resume.progress}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenBook(resume.id)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-lime-300/30 bg-lime-300/10 py-3 text-sm font-semibold text-lime-200 transition hover:bg-lime-300/20"
              >
                <i className="ri-play-fill text-base"></i>
                continuar digitando
              </button>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
                <i className="ri-book-open-line text-xl"></i>
              </div>
              <p className="text-sm text-slate-400">Sua estante está vazia.</p>
              <button
                type="button"
                onClick={onImport}
                className="mt-4 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-lime-200"
              >
                importar o primeiro livro
              </button>
            </div>
          )}
        </div>
      </section>

      <StatsCards
        totalWords={stats.totalWords}
        bookCount={books.length}
        completedSessions={stats.completedSessions}
        avgWpm={stats.avgWpm}
      />

      <section id="library" className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300">
              sua estante
            </div>
            <h2 className="mt-2 font-serif text-3xl text-white">Livros em andamento</h2>
          </div>
          <button
            type="button"
            onClick={onImport}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white sm:flex"
          >
            <i className="ri-add-line text-base"></i>
            adicionar livro
          </button>
        </div>

        <div className="grid gap-3">
          {books.map((book) => (
            <div
              key={book.id}
              className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
            >
              <button
                type="button"
                onClick={() => onOpenBook(book.id)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <BookSpine title={book.title} color={book.coverColor} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-white">{book.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {book.author} · {FORMAT_LABEL[book.format] ?? book.format.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full bg-lime-300/80 transition-all"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-slate-400">{book.progress}%</span>
                    <span className="hidden text-xs text-slate-600 sm:inline">
                      {formatNumber(book.wordCount)} palavras
                    </span>
                  </div>
                </div>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuId((cur) => (cur === book.id ? null : book.id))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
                  aria-label="Mais opções"
                >
                  <i className="ri-more-fill text-lg"></i>
                </button>
                {menuId === book.id && (
                  <div className="tb-anim-scale absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-white/[0.08] bg-[#18252d] p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuId(null);
                        onRemoveBook(book.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10"
                    >
                      <i className="ri-delete-bin-6-line text-base"></i>
                      Remover livro
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onImport}
            className="group flex items-center gap-4 rounded-2xl border border-dashed border-white/10 p-4 text-left transition hover:border-lime-300/40 hover:bg-lime-300/[0.03]"
          >
            <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-500 transition group-hover:text-lime-300">
              <i className="ri-add-line text-xl"></i>
            </div>
            <div>
              <div className="font-medium text-slate-300">Adicionar outro livro</div>
              <div className="mt-1 text-xs text-slate-600">
                PDF, EPUB ou TXT · processamento local
              </div>
            </div>
          </button>
        </div>
      </section>
    </main>
  );
}