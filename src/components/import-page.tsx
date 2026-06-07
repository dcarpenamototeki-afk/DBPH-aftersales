"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { CloudDownload, Save, Upload } from "lucide-react";
import { moduleConfig } from "@/lib/schema";
import { mapImportRow } from "@/lib/import";
import type { ModuleKey } from "@/lib/types";
import { PageHeader } from "./page-header";

export function ImportPage() {
  const [moduleKey, setModuleKey] = useState<ModuleKey>("orcr");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const config = moduleConfig[moduleKey];

  const preview = useMemo(() => rows.map((row) => mapImportRow(moduleKey, row)).slice(0, 25), [rows, moduleKey]);

  async function loadGoogleSheet() {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/import?module=${moduleKey}`);
    const body = await response.json();
    setRows(body.rows ?? []);
    setMessage(body.error ?? `Loaded ${body.rows?.length ?? 0} rows from Google Sheets.`);
    setLoading(false);
  }

  async function onCsv(file: File) {
    setMessage("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data as Record<string, unknown>[]);
        setMessage(`Loaded ${result.data.length} rows from CSV.`);
      }
    });
  }

  async function saveRows() {
    setLoading(true);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: moduleKey, rows })
    });
    const body = await response.json();
    setMessage(body.error ?? `Saved ${body.inserted} rows. Skipped ${body.skipped} duplicates.`);
    setLoading(false);
  }

  return (
    <>
      <PageHeader title="Import Data" />
      <div className="mb-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Module
            <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value as ModuleKey)}>
              <option value="orcr">ORCR / Plate</option>
              <option value="sales">Sales Invoice</option>
              <option value="inventory">Inventory</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              onClick={loadGoogleSheet}
              disabled={loading}
            >
              <CloudDownload size={16} />
              Import from Google Sheet
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
              <Upload size={16} />
              Upload CSV
              <input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && onCsv(event.target.files[0])} />
            </label>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={saveRows}
              disabled={!rows.length || loading}
            >
              <Save size={16} />
              Save Previewed Rows
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </div>

      <div className="mb-4 rounded-lg border border-line bg-white p-4 shadow-soft">
        <h3 className="mb-2 font-semibold text-ink">Column Mapping</h3>
        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
          {config.columns.map((column) => (
            <p key={String(column.key)}>
              <span className="font-medium text-ink">{column.label}</span> maps to <code>{String(column.key)}</code>
            </p>
          ))}
        </div>
      </div>

      <div className="table-scroll max-h-[calc(100vh-360px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {config.columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.length ? (
              preview.map((row, index) => (
                <tr key={index} className="odd:bg-white even:bg-slate-50">
                  {config.columns.map((column) => (
                    <td key={String(column.key)} className="whitespace-nowrap border-b border-line px-3 py-2">
                      {String(row[String(column.key)] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={config.columns.length}>
                  Import from Google Sheets or upload a CSV to preview rows before saving.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
