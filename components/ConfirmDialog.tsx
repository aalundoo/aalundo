"use client";

import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-sm animate-fade-up p-6 text-center"
        role="alertdialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold">{title}</h2>
        {message && <p className="mt-2 text-sm text-slate-400">{message}</p>}
        <div className="mt-6 flex gap-2">
          <button onClick={onCancel} disabled={busy} className="btn-ghost flex-1 py-2.5">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              danger
                ? "btn flex-1 bg-rose-500 py-2.5 text-white hover:bg-rose-600"
                : "btn-primary flex-1 py-2.5"
            }
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
