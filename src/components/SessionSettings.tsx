import type { SessionSettings as Settings } from "@/types";
interface Props { value: Settings; onChange: (value: Settings) => void; }
export default function SessionSettings({ value, onChange }: Props) {
  const cls = "rounded-xl border border-white/10 bg-[#111c28] px-3 py-2 text-sm text-slate-200";
  return <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
    <label className="flex flex-col gap-1 text-[11px] text-slate-500">modo
      <select className={cls} value={value.sessionMode} onChange={e => onChange({ ...value, sessionMode: e.target.value as Settings["sessionMode"] })}><option value="words">Por palavras</option><option value="sentences">Por frases</option><option value="time">Por tempo</option></select>
    </label>
    {value.sessionMode === "words" && <label className="flex flex-col gap-1 text-[11px] text-slate-500">tamanho
      <select className={cls} value={value.wordsPerSession} onChange={e => onChange({ ...value, wordsPerSession: Number(e.target.value) as Settings["wordsPerSession"] })}><option value={100}>100 palavras</option><option value={250}>250 palavras</option><option value={500}>500 palavras</option></select>
    </label>}
    {value.sessionMode === "sentences" && <label className="flex flex-col gap-1 text-[11px] text-slate-500">tamanho
      <select className={cls} value={value.sentencesPerSession} onChange={e => onChange({ ...value, sentencesPerSession: Number(e.target.value) as 1 | 2 })}><option value={1}>1 frase</option><option value={2}>2 frases</option></select>
    </label>}
    {value.sessionMode === "time" && <label className="flex flex-col gap-1 text-[11px] text-slate-500">duração
      <select className={cls} value={value.durationMinutes ?? "free"} onChange={e => onChange({ ...value, durationMinutes: e.target.value === "free" ? null : Number(e.target.value) as Settings["durationMinutes"] })}><option value={1}>1 minuto</option><option value={2}>2 minutos</option><option value={3}>3 minutos</option><option value={4}>4 minutos</option><option value={5}>5 minutos</option><option value="free">livre</option></select>
    </label>}
  </div>;
}
