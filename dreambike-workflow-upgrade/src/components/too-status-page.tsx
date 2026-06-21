"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FilePenLine, PackageCheck, Plus, Search, Trash2, X } from "lucide-react";
import type { ColumnDef, TooStatusRecord } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { RecordFormModal } from "./record-form-modal";
import { StatusBadge } from "./status-badge";

const columns: ColumnDef<TooStatusRecord>[] = [
  { key: "origin", label: "1st OR/CR Origin", type: "status", options: ["SWAP UNIT", "PERSONAL BIKE", "SINSKI", "SB FINANCE"], required: true },
  { key: "first_owner_name", label: "1st Owner", required: true },
  { key: "new_owner_name", label: "New Owner", required: true },
  { key: "motorcycle_unit_type", label: "Motorcycle / Unit Type" },
  { key: "color", label: "Color" },
  { key: "engine_number", label: "Engine Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "plate_number", label: "Plate Number" },
  { key: "date_received", label: "Date Received", type: "date" },
  { key: "remarks", label: "Remarks" }
];

const emptyRecord: Partial<TooStatusRecord> = {
  origin: "PERSONAL BIKE",
  first_owner_name: "",
  new_owner_name: "",
  motorcycle_unit_type: "",
  color: "",
  engine_number: "",
  chassis_number: "",
  plate_number: "",
  date_received: new Date().toISOString().slice(0, 10),
  remarks: ""
};

export function TooStatusPage() {
  const [rows, setRows] = useState<TooStatusRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<TooStatusRecord> | null>(null);
  const [deleting, setDeleting] = useState<TooStatusRecord | null>(null);
  const [checking, setChecking] = useState<TooStatusRecord | null>(null);
  const [releasing, setReleasing] = useState<TooStatusRecord | null>(null);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/too-status?search=${encodeURIComponent(search)}`);
    const body = await response.json();
    setRows(body.data ?? []);
    setMessage(body.error ?? "");
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleRows = useMemo(() => rows, [rows]);

  async function save() {
    if (!editing) return;
    const response = await fetch(editing.id ? `/api/too-status/${editing.id}` : "/api/too-status", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to save ToO record.");
      return;
    }
    setEditing(null);
    setMessage("ToO record saved.");
    await load();
  }

  async function remove() {
    if (!deleting) return;
    const response = await fetch(`/api/too-status/${deleting.id}`, { method: "DELETE" });
    const body = await response.json();
    setDeleting(null);
    setMessage(body.error ?? "ToO record deleted.");
    await load();
  }

  async function runDataCheck() {
    if (!checking) return;
    const response = await fetch(`/api/too-status/${checking.id}/data-check`, { method: "POST" });
    const body = await response.json();
    setChecking(null);
    setMessage(body.error ?? (body.matched ? "ORCR record matched, moved to ToO Status, and removed from ORCR / Plate Monitoring." : "No matching 1st Owner record was found."));
    await load();
  }

  async function release() {
    if (!releasing || !releaseDate) return;
    const response = await fetch(`/api/too-status/${releasing.id}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseDate })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to release ToO documents.");
      return;
    }
    setReleasing(null);
    setMessage("ToO documents released and added to Released ORCR / Plate.");
    await load();
  }

  return (
    <>
      <PageHeader title="ToO Status">
        <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing({ ...emptyRecord })}>
          <Plus size={16} />
          Add ToO Record
        </button>
      </PageHeader>

      <div className="mb-4 rounded-lg border border-line bg-white p-3 shadow-soft">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input className="w-full pl-9" placeholder="Search owner, unit, engine, chassis, or plate" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      {message ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-240px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Status</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Data Check</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Origin</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">1st Owner</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">New Owner</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Motorcycle</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Engine Number</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Chassis Number</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Plate Number</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Release Date</th>
              <th className="sticky right-0 border-b border-line bg-slate-100 px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={11}>Loading ToO records...</td></tr>
            ) : visibleRows.length ? visibleRows.map((row) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.status} /></td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.data_check_status} /></td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.origin}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.first_owner_name}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.new_owner_name}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.motorcycle_unit_type || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.engine_number || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.chassis_number || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_number || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.release_date || "-"}</td>
                <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                  <div className="flex gap-1">
                    <button title="Data Check" className="rounded-md p-2 text-violet-700 hover:bg-violet-50" onClick={() => setChecking(row)}><ClipboardCheck size={16} /></button>
                    <button disabled={row.status === "RELEASED" || row.data_check_status === "NOT CHECKED"} title="Release Documents" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30" onClick={() => setReleasing(row)}><PackageCheck size={16} /></button>
                    <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                    <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={11}>No ToO records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing ? <RecordFormModal title="ToO Record Details" columns={columns} values={editing} onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))} onClose={() => setEditing(null)} onSubmit={save} /> : null}
      {deleting ? <ConfirmDialog title="Delete ToO record" message="This permanently removes the selected ToO history." onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
      {checking ? <ConfirmDialog title="Run Data Check" message={`Check ORCR / Plate Monitoring for ${checking.first_owner_name}? A matched record will be moved into ToO Status and removed from monitoring.`} onCancel={() => setChecking(null)} onConfirm={runDataCheck} /> : null}

      {releasing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div><h3 className="font-semibold text-ink">Release ToO Documents</h3><p className="mt-1 text-sm text-slate-500">{releasing.new_owner_name}</p></div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setReleasing(null)}><X size={18} /></button>
            </div>
            <div className="p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Release Date<input type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setReleasing(null)}>Cancel</button>
              <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={release}>Release Documents</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
