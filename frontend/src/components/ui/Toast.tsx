"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...item, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = item.duration || 4500;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => {
    addToast({ type: "success", message, title });
  }, [addToast]);

  const error = useCallback((message: string, title?: string) => {
    addToast({ type: "error", message, title });
  }, [addToast]);

  const info = useCallback((message: string, title?: string) => {
    addToast({ type: "info", message, title });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string) => {
    addToast({ type: "warning", message, title });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      {/* Toast Render Container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl apple-glass-elevated border shadow-glass-elevated animate-slide-up transition-all ${
              t.type === "success"
                ? "border-accent-emerald/30 text-emerald-200"
                : t.type === "error"
                ? "border-accent-coral/30 text-rose-200"
                : t.type === "warning"
                ? "border-accent-gold/30 text-amber-200"
                : "border-accent-blue/30 text-blue-200"
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-accent-emerald" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-accent-coral" />}
              {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-accent-gold" />}
              {t.type === "info" && <Info className="w-5 h-5 text-accent-blue" />}
            </span>

            <div className="flex-1 min-w-0">
              {t.title && (
                <h4 className="text-body-sm font-bold text-content-primary truncate">
                  {t.title}
                </h4>
              )}
              <p className="text-body-sm text-content-secondary leading-snug">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss toast"
              className="shrink-0 p-1 rounded-lg text-content-muted hover:text-content-primary transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
