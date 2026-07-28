"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, FilePenLine, Plus, Search, Trash2, X } from "lucide-react";
import type { SalesInvoiceTrackerRecord } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

type InvoiceAlert = "IN PROGRESS" | "FOR FOLLOW UP" | "PRIORITY" | "COMPLETED" | "NO DATE";

const today = new Date().toISOString().slice(0, 10);

const emptyRecord: Partial<SalesInvoiceTrackerRecord> = {
  model: "",
  engine_number: "",
  chassis_number: "",
  color: "",
  date_submitted_to_bristol: today,
  status: "PENDING",
  note: "",
  date_released: null
};

function calendarDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function invoiceTiming(row: Partial<SalesInvoiceTrackerRecord>): { label: string; alert: InvoiceAlert } {
  if (row.status === "CLAIMED") return { label: "Completed", alert: "COMPLETED" };
  if (!row.date_submitted_to_bristol) return { label: "No date", alert: "NO DATE" };

  const submitted = calendarDay(row.date_submitted_to_bristol);
  const now = calendarDay(new Date().toISOString().slice(0, 10));
  if (!submitted || !now) return { label: "No date", alert: "NO DATE" };

  const elapsedDays = Math.max(1, Math.floor((now.getTime() - submitted.getTime()) / 86400000) + 1);
  if (elapsedDays <= 2) return { label: `Day ${elapsedDays}/5`, alert: "IN PROGRESS" };
  if (elapsedDays <= 4) return { label: `Day ${elapsedDays}/5`, alert: "FOR FOLLOW UP" };
  return { label: `Day ${elapsedDays}/5`, alert: "PRIORITY" };
}

function alertClass(alert: InvoiceAlert) {
  if (alert === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (alert === "PRIORITY") return "border-rose-200 bg-rose-50 text-rose-700";
  if (alert === "FOR FOLLOW UP") return "border-amber-200 bg-amber-50 text-amber-700";
  if (alert === "IN PROGRESS") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function SalesInvoiceTrackerPage() {
  const [rows, setRows] = useState<SalesInvoiceTrackerRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editing, setEditing] = useState<Partial<SalesInvoiceTrackerRecord> | null>(null);
  const [deleting, setDeleting] = useState<SalesInvoiceTrackerRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/sales-invoice-tracker?search=${encodeURIComponent(search)}`);
    const body = await response.json();
    setRows(body.data ?? []);
    setMessage(body.error ?? "");
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === "ALL") return true;
      if (["IN PROGRESS", "FOR FOLLOW UP", "PRIORITY"].includes(statusFilter)) {
        return invoiceTiming(row).alert === statusFilter;
      }
      return row.status === statusFilter;
    });
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === "PENDING");
    return {
      total: rows.length,
      pending: pending.length,
      claimed: rows.filter((row) => row.status === "CLAIMED").length,
      followUp: pending.filter((row) => invoiceTiming(row).alert === "FOR FOLLOW UP").length,
      priority: pending.filter((row) => invoiceTiming(row).alert === "PRIORITY").length
    };
  }, [rows]);

  function updateEditing(key: keyof SalesInvoiceTrackerRecord, value: string) {
    setEditing((current) => {
      return { ...(current ?? {}), [key]: value };
    });
  }

  async function save() {
    if (!editing) return;
    const payload = {
      ...editing,
      status: editing.status ?? "PENDING",
      date_released: editing.status === "CLAIMED" ? editing.date_released ?? null : null
    };
    const response = await fetch(editing.id ? `/api/sales-invoice-tracker/${editing.id}` : "/api/sales-invoice-tracker", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to save sales invoice tracker record.");
      return;
    }
    setEditing(null);
    setMessage("Sales invoice tracker record saved.");
    await load();
  }

  async function markClaimed(row: SalesInvoiceTrackerRecord) {
    const response = await fetch(`/api/sales-invoice-tracker/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLAIMED", date_released: row.date_released || today })
    });
    const body = await response.json();
    setMessage(body.error ?? "Sales invoice marked claimed.");
    await load();
  }

  async function remove() {
    if (!deleting) return;
    const response = await fetch(`/api/sales-invoice-tracker/${deleting.id}`, { method: "DELETE" });
    const body = await response.json();
    setDeleting(null);
    setMessage(body.error ?? "Sales invoice tracker record deleted.");
    await load();
  }

  return (
    <>
      <PageHeader title="Sales Invoice Tracker">
        <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing({ ...emptyRecord })}>
          <Plus size={16} />
          Add Invoice
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <SummaryCard label="Total Entries" value={stats.total} />
        <SummaryCard label="Pending" value={stats.pending} tone="amber" />
        <SummaryCard label="For Follow Up" value={stats.followUp} tone="blue" />
        <SummaryCard label="Priority" value={stats.priority} tone="rose" />
        <SummaryCard label="Claimed" value={stats.claimed} tone="emerald" />
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-3 shadow-soft md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input className="w-full pl-9" placeholder="Search model, engine, chassis, color, note, or status" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All records</option>
          <option value="PENDING">Pending</option>
          <option value="IN PROGRESS">In Progress</option>
          <option value="FOR FOLLOW UP">For Follow Up</option>
          <option value="PRIORITY">Priority</option>
          <option value="CLAIMED">Claimed</option>
        </select>
      </div>

      {message ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-310px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Model</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Engine #</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Chassis #</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Color</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Submitted to Bristol</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Day Countdown</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Status</th>
              <th className="min-w-64 border-b border-line px-3 py-3">Note</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3">Date Released</th>
              <th className="sticky right-0 border-b border-line bg-slate-100 px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={10}>Loading sales invoice tracker...</td></tr>
            ) : visibleRows.length ? visibleRows.map((row) => {
              const timing = invoiceTiming(row);
              return (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                  <td className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold text-ink">{row.model || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.engine_number || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.chassis_number || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.color || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.date_submitted_to_bristol || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${alertClass(timing.alert)}`}>
                      <CalendarClock size={14} />
                      {timing.label} - {timing.alert}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.status} /></td>
                  <td className="border-b border-line px-3 py-2 text-slate-700">{row.note || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.date_released || "-"}</td>
                  <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                    <div className="flex gap-1">
                      <button disabled={row.status === "CLAIMED"} title="Mark Claimed" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30" onClick={() => markClaimed(row)}><CheckCircle2 size={16} /></button>
                      <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                      <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={10}>No sales invoice tracker records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">{editing.id ? "Edit Sales Invoice Tracker" : "Add Sales Invoice Tracker"}</h3>
                <p className="mt-1 text-sm text-slate-500">Monitor Bristol sales invoice submission and release status.</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid max-h-[65vh] gap-3 overflow-auto p-5 md:grid-cols-2">
              <Field label="Model" value={editing.model ?? ""} onChange={(value) => updateEditing("model", value)} required />
              <Field label="Color" value={editing.color ?? ""} onChange={(value) => updateEditing("color", value)} />
              <Field label="Engine #" value={editing.engine_number ?? ""} onChange={(value) => updateEditing("engine_number", value)} required />
              <Field label="Chassis #" value={editing.chassis_number ?? ""} onChange={(value) => updateEditing("chassis_number", value)} required />
              <Field label="Date of Submission to Bristol" type="date" value={editing.date_submitted_to_bristol ?? ""} onChange={(value) => updateEditing("date_submitted_to_bristol", value)} required />
              <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                Note
                <textarea className="min-h-28 rounded-md border border-line px-3 py-2" value={editing.note ?? ""} onChange={(event) => updateEditing("note", event.target.value)} placeholder="Follow-up notes, contact person, or reminders" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setEditing(null)}>Cancel</button>
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={save}>Save Record</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleting ? <ConfirmDialog title="Delete sales invoice tracker" message="This permanently removes the selected sales invoice tracker record." onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SummaryCard({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "blue" | "rose" | "emerald" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800"
  };

  return (
    <div className={`rounded-lg border p-4 shadow-soft ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
