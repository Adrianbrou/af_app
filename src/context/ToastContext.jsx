import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
    info: (msg) => add(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onRemove }) {
  const styles = {
    success: "bg-neutral-900 border-emerald-600/60 text-emerald-400",
    error:   "bg-neutral-900 border-red-600/60 text-red-400",
    info:    "bg-neutral-900 border-blue-600/60 text-blue-400",
  };
  const icons = {
    success: <CheckCircle className="h-4 w-4 shrink-0" />,
    error:   <XCircle className="h-4 w-4 shrink-0" />,
    info:    <AlertCircle className="h-4 w-4 shrink-0" />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/40 animate-in slide-in-from-bottom-2 ${styles[t.type]}`}
    >
      {icons[t.type]}
      <p className="text-sm text-white flex-1">{t.message}</p>
      <button
        onClick={() => onRemove(t.id)}
        className="text-neutral-500 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
