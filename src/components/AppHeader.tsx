import { Link, useLocation } from "react-router-dom";

interface AppHeaderProps {
  onImport?: () => void;
  streakDays?: number;
}

export default function AppHeader({ onImport, streakDays = 7 }: AppHeaderProps) {
  const { pathname } = useLocation();
  const onLibrary = pathname === "/" || pathname.startsWith("/library");
  const onPractice = pathname.startsWith("/practice");

  const navItem = (active: boolean) =>
    `rounded-lg px-4 py-2 text-xs font-semibold transition ${
      active ? "bg-white/8 text-white" : "text-slate-500 hover:text-slate-200"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0b1118]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link to="/" className="group flex items-center gap-3" aria-label="Ir para o dashboard">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-lime-300 text-slate-950 shadow-[0_0_24px_rgba(190,242,100,0.18)]">
            <i className="ri-book-2-line text-lg"></i>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b1118] bg-sky-300"></span>
          </div>
          <div className="text-left">
            <div className="font-serif text-xl leading-none text-white">
              typing<span className="text-lime-300">book</span>
            </div>
            <div className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600 sm:block">
              read · type · repeat
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] p-1 md:flex">
          <Link to="/" className={navItem(onLibrary)}>
            Minha estante
          </Link>
          <Link to="/practice" className={navItem(onPractice)}>
            Praticar
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 sm:flex">
            <div className="h-1.5 w-1.5 rounded-full bg-lime-300"></div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {streakDays} dias de ritmo
            </span>
          </div>
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-lime-200"
            >
              <i className="ri-add-line text-base"></i>
              <span className="hidden sm:inline">importar</span>
            </button>
          )}
          <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-400 md:flex">
            <i className="ri-user-3-line text-base"></i>
          </div>
        </div>
      </div>
    </header>
  );
}