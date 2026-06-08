"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

type ActivityLog = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_by_email: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

const tableLabels: Record<string, string> = {
  orcr_plate_records: "ORCR / Plate",
  sales_invoice_records: "Sales Invoice",
  sb_finance_inventory: "SB Finance",
  unidentified_plate_records: "Unidentified Plates"
};

function changedFields(row: ActivityLog) {
  if (row.action === "CREATE") return Object.keys(row.new_data ?? {}).filter((key) => !["id", "created_at", "updated_at"].includes(key));
  if (row.action === "DELETE") return Object.keys(row.old_data ?? {}).filter((key) => !["id", "created_at", "updated_at"].includes(key));

  const oldData = row.old_data ?? {};
  const newData = row.new_data ?? {};
  return Object.keys(newData)
    .filter((key) => !["updated_at"].includes(key))
    .filter((key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]));
}

export function AuditLogPage() {
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch(`/api/activity-log?search=${encodeURIComponent(search)}`)
        .then((response) => response.json())
        .then((body) => {
          setRows(body.data ?? []);
          setError(body.error ?? "");
        })
        .catch(() => setError("Unable to load audit log."));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const displayed = useMemo(() => rows, [rows]);

  return (
    <>
      <PageHeader title="Audit Log" />
      <div className="mb-4 rounded-lg border border-line bg-white p-3 shadow-soft">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input
            className="w-full pl-9"
            placeholder="Search action, module, or user"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Date / Time</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">User</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Action</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Module</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Record ID</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Changed Fields</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length ? displayed.map((row) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{new Date(row.created_at).toLocaleString()}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.changed_by_email || row.changed_by || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.action} /></td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{tableLabels[row.table_name] ?? row.table_name}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.record_id ?? "-"}</td>
                <td className="max-w-xl border-b border-line px-3 py-2">
                  <span className="line-clamp-2 text-slate-600">{changedFields(row).join(", ") || "-"}</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={6}>No audit logs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
