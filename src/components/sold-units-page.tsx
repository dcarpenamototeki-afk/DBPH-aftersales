"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePenLine, Search, Trash2 } from "lucide-react";
import { ColumnDef, InventoryRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";

const soldEditColumns: ColumnDef<InventoryRecord>[] = [
  { key: "sold_date", label: "Date", type: "date" },
  { key: "motor_number", label: "Motor Number" },
  { key: "registered_name", label: "Registered Name" },
  { key: "motorcycle_model", label: "Motorcycle Model" },
  { key: "year_model", label: "Year" },
  { key: "color", label: "Color" },
  { key: "plate_number", label: "Plate Number" },
  { key: "new_owner", label: "New Owner" },
  { key: "sold_orcr_released", label: "ORCR Released", type: "status", options: ["CLAIMED", "TO FOLLOW"] },
  { key: "sold_plate_released", label: "Plate Released", type: "status", options: ["CLAIMED", "TO FOLLOW"] },
  { key: "sold_sb_finance_documents", label: "SB Finance Documents", type: "status", options: ["CLAIMED", "TO FOLLOW"] },
  { key: "sold_for_too", label: "For TOO", type: "boolean" }
];

export function SoldUnitsPage() {
  const [rows, setRows] = useState<InventoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<InventoryRecord> | null>(null);
  const [deleting, setDeleting] = useState<InventoryRecord | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/inventory")
      .then((response) => response.json())
      .then((body) => {
        setRows(body.data ?? []);
        setError(body.error ?? "");
      })
      .catch(() => setError("Unable to load sold units."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit() {
    if (!editing?.id) return;
    const response = await fetch(`/api/inventory/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to update sold unit.");
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteRow() {
    if (!deleting) return;
    await fetch(`/api/inventory/${deleting.id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  const soldRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => row.main_status === "SOLD")
      .filter((row) => {
        if (!needle) return true;
        return [
          row.motor_number,
          row.registered_name,
          row.motorcycle_model,
          row.plate_number,
          row.new_owner,
          row.year_model,
          row.color
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [rows, search]);

  return (
    <>
      <PageHeader title="Sold Units Record" />
      <div className="mb-4 rounded-lg border border-line bg-white p-3 shadow-soft">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input
            className="w-full pl-9"
            placeholder="Search sold units"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-230px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {[
                "Date",
                "Motor Number",
                "Registered Name",
                "Motorcycle Model",
                "Year",
                "Color",
                "Plate Number",
                "New Owner",
                "ORCR Released",
                "Plate Released",
                "SB Finance Documents",
                "For TOO",
                "Actions"
              ].map((header) => (
                <th key={header} className={`${header === "Actions" ? "sticky right-0 bg-slate-100" : ""} whitespace-nowrap border-b border-line px-3 py-3 font-semibold`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {soldRows.length ? (
              soldRows.map((row) => (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.sold_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.motor_number}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.registered_name}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.motorcycle_model}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.year_model}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.color}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_number}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.new_owner}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.sold_orcr_released} /></td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.sold_plate_released} /></td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.sold_sb_finance_documents} /></td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.sold_for_too} /></td>
                  <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                    <div className="flex gap-1">
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
                <td className="px-3 py-6 text-slate-500" colSpan={13}>
                  No sold units yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing ? (
        <RecordFormModal
          title="Edit Sold Unit"
          columns={soldEditColumns}
          values={editing}
          onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete sold unit"
          message="This will permanently delete the selected sold unit record."
          onCancel={() => setDeleting(null)}
          onConfirm={deleteRow}
        />
      ) : null}
    </>
  );
}
