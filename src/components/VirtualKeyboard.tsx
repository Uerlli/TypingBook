interface VirtualKeyboardProps {
  nextChar: string;
}

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export default function VirtualKeyboard({ nextChar }: VirtualKeyboardProps) {
  const target = nextChar.toLowerCase();

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          teclado
        </span>
        <span className="text-[10px] text-slate-600">siga o destaque</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1.5">
            {row.map((key) => {
              const active = key === target;
              return (
                <span
                  key={key}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[11px] font-semibold uppercase transition ${
                    active
                      ? "border-lime-300/50 bg-lime-300 text-slate-950"
                      : "border-white/[0.07] bg-white/[0.03] text-slate-400"
                  }`}
                >
                  {key}
                </span>
              );
            })}
          </div>
        ))}
        <span
          className={`mt-0.5 flex h-9 w-56 items-center justify-center rounded-lg border text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
            target === " " || nextChar === " "
              ? "border-lime-300/50 bg-lime-300 text-slate-950"
              : "border-white/[0.07] bg-white/[0.03] text-slate-500"
          }`}
        >
          espaço
        </span>
      </div>
    </div>
  );
}