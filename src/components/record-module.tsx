"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, PackageCheck, Plus, Search, Trash2, Upload, FilePenLine } from "lucide-react";
import { ColumnDef, ModuleKey } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { ReleaseModal, ReleasePayload } from "./release-modal";
import { SoldModal, SoldPayload } from "./sold-modal";

type Config<T> = {
  module: ModuleKey;
  title: string;
  apiPath: string;
  columns: ColumnDef<T>[];
  filters: { key: keyof T; label: string; options: string[] }[];
};

function emptyRecord<T extends Record<string, unknown>>(columns: ColumnDef<T>[]) {
  return Object.fromEntries(
    columns.map((column) => [column.key, column.type === "boolean" ? false : column.type === "number" || column.type === "money" ? null : ""])
  ) as Partial<T>;
}

export function RecordModule<T extends Record<string, unknown>>({ config }: { config: Config<T> }) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [releasing, setReleasing] = useState<T | null>(null);
  const [selling, setSelling] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`${config.apiPath}?search=${encodeURIComponent(search)}`);
    const body = await response.json();
    setRows(body.data ?? []);
    setError(body.error ?? "");
    setLoading(false);
  }, [config.apiPath, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => config.module !== "orcr" || (!row.orcr_release_date && !row.plate_release_date))
      .filter((row) => config.module !== "inventory" || String(row.main_status ?? "AVAILABLE") !== "SOLD")
      .filter((row) =>
        Object.entries(filters).every(([key, value]) => !value || String(row[key] ?? "").toUpperCase() === value.toUpperCase())
      );
  }, [rows, filters, config.module]);

  async function save() {
    if (!editing) return;
    const id = editing.id as string | undefined;
    const response = await fetch(id ? `${config.apiPath}/${id}` : config.apiPath, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to save record.");
      return;
    }
    setEditing(null);
    await load();
  }

  async function remove() {
    if (!deleting) return;
    await fetch(`${config.apiPath}/${deleting.id}`, { method: "DELETE" });
    setDeleting(null);
    await load();
  }

  async function release(payload: ReleasePayload) {
    if (!releasing) return;
    const update: Record<string, unknown> = {};

    payload.targets.forEach((target) => {
      update[`${target}_release_date`] = payload.date;
      update[`${target}_release_method`] = payload.method;
      update[`${target}_lbc_tracking_number`] = payload.method === "LBC" ? payload.trackingNumber : "";
      update[`${target}_received_by`] = payload.method === "WALK IN" ? payload.receivedBy : "";
      if (target === "orcr") update.orcr_on_hand = false;
      if (target === "plate") update.plate_on_hand = false;
    });

    if (payload.remarks) update.remarks = payload.remarks;

    const response = await fetch(`${config.apiPath}/${releasing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to save release.");
      return;
    }

    setReleasing(null);
    await load();
  }

  async function markSold(payload: SoldPayload) {
    if (!selling) return;
    const response = await fetch(`${config.apiPath}/${selling.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, main_status: "SOLD" })
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to save sold unit.");
      return;
    }

    setSelling(null);
    await load();
  }

  return (
    <>
      <PageHeader title={config.title}>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
            href={`/api/export/${config.module}`}
          >
            <Download size={16} />
            Export CSV
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
            href={`/import?module=${config.module}`}
          >
            <Upload size={16} />
            Import
          </a>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setEditing(emptyRecord(config.columns))}
          >
            <Plus size={16} />
            Add Record
          </button>
        </div>
      </PageHeader>

      <div className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-3 shadow-soft lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input
            className="w-full pl-9"
            placeholder="Search records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {config.filters.map((filter) => (
            <select
              key={String(filter.key)}
              value={filters[String(filter.key)] ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, [String(filter.key)]: event.target.value }))}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-260px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {config.columns.map((column) => (
                <th key={String(column.key)} className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
              <th className="sticky right-0 border-b border-line bg-slate-100 px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={config.columns.length + 1}>
                  Loading records...
                </td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={String(row.id)} className="odd:bg-white even:bg-slate-50">
                  {config.columns.map((column) => {
                    const value = row[column.key];
                    const isStatus = column.type === "boolean" || column.type === "status" || String(column.key).includes("status");
                    return (
                      <td key={String(column.key)} className="whitespace-nowrap border-b border-line px-3 py-2">
                        {isStatus ? <StatusBadge value={value} /> : String(value ?? "")}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                    <div className="flex gap-1">
                      {config.module === "orcr" ? (
                        <button title="Release ORCR / Plate" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => setReleasing(row)}>
                          <PackageCheck size={16} />
                        </button>
                      ) : null}
                      {config.module === "inventory" ? (
                        <button title="Sold" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => setSelling(row)}>
                          <PackageCheck size={16} />
                        </button>
                      ) : null}
                      <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}>
                        <FilePenLine size={16} />
                      </button>
                      <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={config.columns.length + 1}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <RecordFormModal
          title="Record Details"
          columns={config.columns}
          values={editing}
          onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value } as Partial<T>))}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete record"
          message="This will permanently remove the selected record."
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      ) : null}
      {releasing ? (
        <ReleaseModal
          title={String(releasing.registered_name ?? releasing.plate_number ?? "")}
          onClose={() => setReleasing(null)}
          onSubmit={release}
        />
      ) : null}
      {selling ? (
        <SoldModal
          title={String(selling.motor_number ?? selling.registered_name ?? "")}
          onClose={() => setSelling(null)}
          onSubmit={markSold}
        />
      ) : null}
    </>
  );
}
