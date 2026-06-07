"use client";

import { X } from "lucide-react";
import { ColumnDef } from "@/lib/types";

export function RecordFormModal<T extends Record<string, unknown>>({
  title,
  columns,
  values,
  onChange,
  onClose,
  onSubmit
}: {
  title: string;
  columns: ColumnDef<T>[];
  values: Partial<T>;
  onChange: (key: keyof T, value: unknown) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-semibold text-ink">{title}</h3>
          <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((column) => {
            const key = column.key;
            const value = values[key] as string | number | boolean | null | undefined;

            return (
              <label key={String(key)} className="grid gap-1.5 text-sm font-medium text-slate-700">
                {column.label}
                {column.type === "boolean" ? (
                  <select value={value ? "true" : "false"} onChange={(event) => onChange(key, event.target.value === "true")}>
                    <option value="true">YES</option>
                    <option value="false">NO</option>
                  </select>
                ) : column.options ? (
                  <select value={String(value ?? "")} onChange={(event) => onChange(key, event.target.value)}>
                    <option value="">Select</option>
                    {column.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : column.key === "remarks" ? (
                  <textarea
                    value={String(value ?? "")}
                    rows={3}
                    onChange={(event) => onChange(key, event.target.value)}
                  />
                ) : (
                  <input
                    required={column.required}
                    type={column.type === "date" ? "date" : column.type === "number" || column.type === "money" ? "number" : "text"}
                    value={String(value ?? "")}
                    onChange={(event) => onChange(key, column.type === "number" || column.type === "money" ? Number(event.target.value) : event.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={onSubmit}>
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
