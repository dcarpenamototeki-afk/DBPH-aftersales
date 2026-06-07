"use client";

import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="text-rose-600" />
            <div>
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{message}</p>
            </div>
          </div>
          <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
