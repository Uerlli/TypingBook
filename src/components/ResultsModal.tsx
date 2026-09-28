import type { SessionResult } from "@/types";

interface ResultsModalProps {
  result: SessionResult;
  hasNext: boolean;
  sessionNumber: number;
  totalSessions: number;
  onNext: () => void;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResultsModal({
  result,
  hasNext,
  sessionNumber,
  totalSessions,
  onNext,
  onClose,
}: ResultsModalProps) {
  const headline = [
    { label: "ritmo líquido", value: result.wpm, unit: "WPM", icon: "ri-speed-line" },
    { label: "ritmo bruto", value: result.rawWpm, unit: "WPM", icon: "ri-dashboard-3-line" },
    { label: "precisão", value: `${result.accuracy}%`, unit: "", icon: "ri-focus-3-line" },
    { label: "tempo", value: formatTime(result.seconds), unit: "", icon: "ri-timer-line" },
  ];

  const details = [
    { label: "corretos", value: result.correctCharacters, icon: "ri-check-line" },
    { label: "erros totais", value: result.totalErrors, icon: "ri-close-circle-line" },
    { label: "corrigidos", value: result.correctedErrors, icon: "ri-arrow-go-back-line" },
    { label: "não corrigidos", value: result.uncorrectedErrors, icon: "ri-error-warning-line" },
    { label: "substituições", value: result.substitutions, icon: "ri-swap-line" },
    { label: "extras", value: result.extraCharacters, icon: "ri-add-circle-line" },
    { label: "pulados", value: result.missingCharacters, icon: "ri-subtract-line" },
    { label: "backspaces", value: result.backspaces, icon: "ri-delete-back-2-line" },
  ];

  const topPatterns = result.patterns.slice(0, 5);
  const summary =
    result.totalErrors === 0
      ? "Digitação impecável — nenhum erro cometido nesta sessão."
      : `Você cometeu ${result.totalErrors} ${result.totalErrors === 1 ? "erro" : "erros"} e corrigiu ${result.correctedErrors}.` +
        (topPatterns.length
          ? ` Os mais frequentes: ${topPatterns
              .slice(0, 2)
              .map((p) => `${p.expected} → ${p.got}`)
              .join(" e ")}.`
          : "");

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#05090d]/80 backdrop-blur-sm"
      />
      <div className="tb-anim-pop relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111c28] shadow-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto p-7">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
              <i className="ri-checkbox-circle-line text-2xl"></i>
            </div>
            <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-300">
              sessão {sessionNumber} de {totalSessions}
            </div>
            <h2 className="mt-2 font-serif text-2xl text-white">Sessão concluída</h2>
            <p className="mt-2 text-[13px] leading-6 text-slate-400">{summary}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {headline.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-center"
              >
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <i className={`${item.icon} text-sm`}></i>
                  {item.label}
                </div>
                <div className="mt-2 tb-mono text-2xl text-white">
                  {item.value}
                  <span className="ml-1 text-xs text-slate-500">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {details.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-center"
              >
                <div className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <i className={`${item.icon} text-xs`}></i>
                  {item.label}
                </div>
                <div className="mt-1 tb-mono text-base text-slate-100">{item.value}</div>
              </div>
            ))}
          </div>

          {topPatterns.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                erros mais frequentes
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {topPatterns.map((p) => (
                  <span
                    key={`${p.expected}-${p.got}`}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300"
                  >
                    <span className="tb-mono text-slate-100">{p.expected}</span>
                    <i className="ri-arrow-right-line text-xs text-slate-600"></i>
                    <span className="tb-mono text-rose-200">{p.got}</span>
                    <span className="text-slate-600">· {p.count}x</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/[0.06] p-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 whitespace-nowrap"
          >
            voltar à estante
          </button>
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-200 whitespace-nowrap"
            >
              próxima sessão
              <i className="ri-arrow-right-line text-base"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}