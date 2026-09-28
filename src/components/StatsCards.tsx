import { formatNumber } from "@/utils/sessions";

interface StatsCardsProps {
  totalWords: number;
  bookCount: number;
  completedSessions: number;
  avgWpm: number;
}

export default function StatsCards({
  totalWords,
  bookCount,
  completedSessions,
  avgWpm,
}: StatsCardsProps) {
  const cards = [
    {
      label: "palavras na biblioteca",
      value: formatNumber(totalWords),
      hint: `em ${bookCount} ${bookCount === 1 ? "livro" : "livros"}`,
      icon: "ri-book-read-line",
    },
    {
      label: "sessões concluídas",
      value: formatNumber(completedSessions),
      hint: "+3 esta semana",
      icon: "ri-fire-line",
    },
    {
      label: "ritmo médio",
      value: formatNumber(avgWpm),
      unit: "WPM",
      hint: "acima de ontem",
      icon: "ri-flashlight-line",
    },
  ];

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 transition hover:border-white/15"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{card.label}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300">
              <i className={`${card.icon} text-sm`}></i>
            </span>
          </div>
          <div className="mt-3 tb-mono text-2xl text-white">
            {card.value}
            {card.unit && <span className="ml-1 text-sm text-slate-500">{card.unit}</span>}
          </div>
          <div className="mt-1 text-xs text-slate-600">{card.hint}</div>
        </div>
      ))}
    </section>
  );
}