import { useToast, type ToastTone } from "@/context/ToastContext";

const TONE_STYLES: Record<ToastTone, { border: string; icon: string; text: string }> = {
  info: { border: "border-white/10", icon: "ri-information-line text-slate-300", text: "text-slate-200" },
  error: { border: "border-rose-400/30", icon: "ri-error-warning-line text-rose-300", text: "text-rose-100" },
  success: { border: "border-lime-300/30", icon: "ri-checkbox-circle-line text-lime-300", text: "text-lime-100" },
};

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2 sm:right-6">
      {toasts.map((toast) => {
        const style = TONE_STYLES[toast.tone];
        return (
          <div
            key={toast.id}
            className={`tb-anim-pop flex items-start gap-3 rounded-2xl border ${style.border} bg-[#18252d] px-4 py-3.5 shadow-lg`}
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <i className={`${style.icon} text-lg`}></i>
            </div>
            <p className={`flex-1 text-[13px] leading-5 ${style.text}`}>{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar aviso"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}