interface BookSpineProps {
  title: string;
  color: string;
  size?: "sm" | "lg";
}

export default function BookSpine({ title, color, size = "sm" }: BookSpineProps) {
  const dims = size === "lg" ? "h-28 w-[84px] p-2.5" : "h-16 w-12 p-2";
  const text = size === "lg" ? "text-[9px]" : "text-[7px]";
  const ring = size === "lg" ? "h-12 w-12 -right-3 -top-3" : "h-9 w-9 -right-2.5 -top-2.5";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl shadow-lg transition-transform duration-200 group-hover:-translate-y-1 ${dims}`}
      style={{ backgroundColor: color }}
    >
      <div className={`absolute rounded-full border border-black/10 bg-white/15 ${ring}`} />
      <div className="relative flex h-full flex-col justify-between">
        <span
          className={`font-bold uppercase leading-tight tracking-[0.08em] text-slate-900/80 ${text}`}
        >
          {title}
        </span>
      </div>
    </div>
  );
}