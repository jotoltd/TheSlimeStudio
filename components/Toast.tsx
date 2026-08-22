"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckIcon, XIcon, AlertIcon } from "@/components/AdminIcons";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

type ToastContextType = {
  toast: (message: string, type?: "success" | "error" | "info") => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[2000] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-[0.9rem] font-medium animate-slide-up ${
              t.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : t.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-white text-ink border border-ink/10"
            }`}
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            <span className={`flex-shrink-0 ${t.type === "success" ? "text-green-500" : t.type === "error" ? "text-red-500" : "text-ink-soft"}`}>
              {t.type === "success" ? <CheckIcon size={18} /> : t.type === "error" ? <AlertIcon size={18} /> : <span className="w-[18px] h-[18px] rounded-full bg-ink/20" />}
            </span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
              <XIcon size={16} />
            </button>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
