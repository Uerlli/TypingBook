import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_ERROR_EVENT } from "@/utils/localStore";

export type ToastTone = "info" | "error" | "success";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 6000);
    },
    [dismissToast]
  );

  // Surface localStorage quota failures as a friendly toast instead of letting
  // the ErrorBoundary blow up the screen.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      pushToast(detail?.message ?? "Não foi possível salvar localmente.", "error");
    };
    window.addEventListener(STORAGE_ERROR_EVENT, handler);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, handler);
  }, [pushToast]);

  const value = useMemo(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de ToastProvider");
  return ctx;
}