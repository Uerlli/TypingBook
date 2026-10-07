interface StatsBarProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  seconds: number;
  progress: number;
  countdown?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StatsBar({ wpm, rawWpm, accuracy, seconds, progress, countdown = false }: StatsBarProps) {
  const items = [
    { label: "ritmo", value: wpm, unit: "WPM", icon: "ri-speed-line" },
    { label: "bruto", value: rawWpm, unit: "WPM", icon: "ri-dashboard-3-line" },
    { label: "precisão", value: `${accuracy}%`, icon: "ri-focus-3-line" },
    { label: countdown ? "restante" : "tempo", value: formatTime(seconds), icon: "ri-timer-line" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          title={item.label === "ritmo" ? "WPM líquido: somente caracteres corretos por minuto." : item.label === "bruto" ? "WPM bruto: todas as teclas, incluindo erros e Backspace, por minuto." : item.label === "precisão" ? "Percentual de posições corretas." : "Tempo decorrido ou restante."}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300">
            <i className={`${item.icon} text-sm`}></i>
          </span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.label}
            </div>
            <div className="tb-mono text-lg leading-none text-white">
              {item.value}
              {"unit" in item && item.unit && (
                <span className="ml-1 text-[11px] text-slate-500">{item.unit}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="min-w-[160px] flex-1">
        <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>progresso da sessão</span>
          <span className="tb-mono text-lime-200">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-lime-300 transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
