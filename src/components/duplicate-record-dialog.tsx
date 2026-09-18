"use client";

import { AlertTriangle, X } from "lucide-react";

export function DuplicateRecordDialog({
  recordLabel,
  onCancel,
  onOverwrite,
  onCreateNew
}: {
  recordLabel: string;
  onCancel: () => void;
  onOverwrite: () => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <AlertTriangle className="shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-ink">Duplicate ORCR / Plate record</h3>
              <p className="mt-1 text-sm text-slate-600">
                A matching record already exists{recordLabel ? `: ${recordLabel}` : ""}. Choose how to continue.
              </p>
            </div>
          </div>
          <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" onClick={onOverwrite}>
            Overwrite
          </button>
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={onCreateNew}>
            Create New
          </button>
        </div>
      </div>
    </div>
  );
}
