import { useMemo } from "react";
import type { ClassifiedBlock } from "@/types";
import { countWords } from "@/utils/contentClassifier";
import { formatNumber } from "@/utils/sessions";

interface BlockReviewProps {
  blocks: ClassifiedBlock[];
  included: boolean[];
  onToggle: (index: number) => void;
  onSetAll: (value: boolean) => void;
  onSetNarrativeOnly: () => void;
  title: string;
  formatLabel: string;
}

function preview(text: string, words = 15): string {
  const parts = text.split(/\s+/).filter(Boolean);
  const slice = parts.slice(0, words).join(" ");
  return parts.length > words ? `${slice}…` : slice;
}

export default function BlockReview({
  blocks,
  included,
  onToggle,
  onSetAll,
  onSetNarrativeOnly,
  title,
  formatLabel,
}: BlockReviewProps) {
  const stats = useMemo(() => {
    let words = 0;
    let count = 0;
    blocks.forEach((b, i) => {
      if (included[i]) {
        count += 1;
        words += countWords(b.block);
      }
    });
    return { words, count };
  }, [blocks, included]);

  const structuralCount = blocks.filter((b) => b.type === "structural").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300">
            revisão do conteúdo
          </div>
          <h2 className="mt-2 font-serif text-2xl text-white">O que entra na prática?</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-slate-400">
            Detectamos automaticamente o que é texto corrido e o que é estrutura do documento.{" "}
            <span className="text-slate-300">Revise e ajuste</span> antes de confirmar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSetNarrativeOnly}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Só o texto detectado
          </button>
          <button
            type="button"
            onClick={() => onSetAll(true)}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Incluir tudo
          </button>
          <button
            type="button"
            onClick={() => onSetAll(false)}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Excluir tudo
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
          {blocks.length} blocos detectados
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
          {structuralCount} estruturais
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
          {title} · {formatLabel}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {blocks.map((block, index) => {
          const isIncluded = included[index];
          const isStructural = block.type === "structural";
          const blockWords = countWords(block.block);
          return (
            <button
              key={`${index}-${block.block.slice(0, 12)}`}
              type="button"
              onClick={() => onToggle(index)}
              className={`group flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                isIncluded
                  ? "border-lime-300/30 bg-lime-300/[0.06]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                  isIncluded ? "bg-lime-300 text-slate-950" : "bg-white/[0.06] text-slate-500"
                }`}
              >
                {isIncluded ? <i className="ri-check-line"></i> : index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      isStructural
                        ? "bg-white/[0.06] text-slate-400"
                        : "bg-lime-300/15 text-lime-200"
                    }`}
                  >
                    {isStructural ? "Estrutural" : "Texto"}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {formatNumber(blockWords)} palavras
                  </span>
                  <span className="text-[10px] text-slate-600">
                    confiança {Math.round(block.confidence * 100)}%
                  </span>
                </span>
                <span className="mt-2 block text-[13px] leading-6 text-slate-300 group-hover:text-slate-200">
                  {preview(block.block)}
                </span>
              </span>

              <span
                className={`mt-1 h-5 w-9 shrink-0 rounded-full p-0.5 transition ${
                  isIncluded ? "bg-lime-300" : "bg-white/10"
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                    isIncluded ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          );
        })}

        {blocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            Nenhum bloco de texto encontrado neste documento.
          </div>
        )}
      </div>
    </div>
  );
}