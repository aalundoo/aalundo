"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import TermsContent from "./TermsContent";

export default function DisclaimerButton({
  className = "",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-slate-300 ${className}`}
      >
        <ShieldAlert size={14} /> Disclaimer & Terms
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[85vh] w-full max-w-lg animate-fade-up flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ShieldAlert size={18} className="text-brand-400" /> Disclaimer &
                Terms
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <TermsContent />
            </div>
            <div className="border-t border-white/10 px-6 py-4">
              <button onClick={() => setOpen(false)} className="btn-primary w-full py-2.5">
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
