"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FilePenLine, Search, Trash2, X } from "lucide-react";
import { ColumnDef, OrcrPlateRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";

const releaseEditColumns: ColumnDef<OrcrPlateRecord>[] = [
  { key: "registered_name", label: "Registered Name" },
  { key: "new_owner_name", label: "New Owner's Name" },
  { key: "motorcycle_unit_type", label: "Motorcycle / Unit Type" },
  { key: "color", label: "Color" },
  { key: "engine_number", label: "Engine Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "plate_number", label: "Plate Number" },
  { key: "orcr_release_date", label: "ORCR Date Out", type: "date" },
  { key: "orcr_release_method", label: "Mode of Claiming", type: "status", options: ["LBC", "WALK IN"] },
  { key: "orcr_received_by", label: "ORCR Received By" },
  { key: "orcr_claimed_image_url", label: "ORCR Claimed Image Link" },
  { key: "plate_release_date", label: "Plate Date Out", type: "date" },
  { key: "plate_release_method", label: "Mode of Claiming", type: "status", options: ["LBC", "WALK IN"] },
  { key: "plate_received_by", label: "Plate Received By" },
  { key: "plate_claimed_image_url", label: "Plate Claimed Image Link" },
  { key: "remarks", label: "Remarks" }
];

function releaseLabel(row: OrcrPlateRecord) {
  if (row.orcr_release_date && row.plate_release_date) return "ORCR + PLATE";
  if (row.orcr_release_date) return "ORCR ONLY";
  if (row.plate_release_date) return "PLATE ONLY";
  return "PENDING";
}

function dash(value: unknown) {
  return value ? String(value) : "-";
}

function receivedBy(method: string, value: string) {
  return method === "WALK IN" ? dash(value) : "-";
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{dash(value)}</p>
    </div>
  );
}

export function ReleasedPage() {
  const [rows, setRows] = useState<OrcrPlateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Partial<OrcrPlateRecord> | null>(null);
  const [deleting, setDeleting] = useState<OrcrPlateRecord | null>(null);
  const [viewing, setViewing] = useState<OrcrPlateRecord | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch("/api/orcr")
      .then((response) => response.json())
      .then((body) => {
        setRows(body.data ?? []);
        setError(body.error ?? "");
      })
      .catch(() => setError("Unable to load released records."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit() {
    if (!editing?.id) return;
    const response = await fetch(`/api/orcr/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to update released record.");
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteRow() {
    if (!deleting) return;
    await fetch(`/api/orcr/${deleting.id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  const released = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((row) => row.orcr_release_date || row.plate_release_date)
      .filter((row) => !filter || releaseLabel(row) === filter)
      .filter((row) => {
        if (!needle) return true;
        return [
          row.registered_name,
          row.new_owner_name,
          row.owner_name,
          row.motorcycle_unit_type,
          row.color,
          row.engine_number,
          row.chassis_number,
          row.plate_number,
          row.orcr_received_by,
          row.plate_received_by,
          row.orcr_claimed_image_url,
          row.plate_claimed_image_url
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [rows, search, filter]);

  return (
    <>
      <PageHeader title="Released ORCR / Plate" />
      <div className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-3 shadow-soft lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input
            className="w-full pl-9"
            placeholder="Search released records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All release types</option>
          <option value="ORCR ONLY">ORCR only</option>
          <option value="PLATE ONLY">Plate only</option>
          <option value="ORCR + PLATE">ORCR + Plate</option>
        </select>
      </div>

      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-230px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Release Status</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Registered Name</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">New Owner&apos;s Name</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Motorcycle</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Number</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Date Out</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Mode of Claiming</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Received by</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Claimed</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Date Out</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Mode of Claiming</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Received by</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Claimed</th>
              <th className="sticky right-0 border-b border-line bg-slate-100 px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {released.length ? (
              released.map((row) => (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={releaseLabel(row)} /></td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.registered_name}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{dash(row.new_owner_name)}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.motorcycle_unit_type}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_number}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.orcr_release_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.orcr_release_method || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{receivedBy(row.orcr_release_method, row.orcr_received_by)}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {row.orcr_claimed_image_url ? (
                      <a className="font-semibold text-blue-700 hover:underline" href={row.orcr_claimed_image_url} target="_blank" rel="noreferrer">IMAGE</a>
                    ) : "-"}
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_method || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{receivedBy(row.plate_release_method, row.plate_received_by)}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {row.plate_claimed_image_url ? (
                      <a className="font-semibold text-blue-700 hover:underline" href={row.plate_claimed_image_url} target="_blank" rel="noreferrer">IMAGE</a>
                    ) : "-"}
                  </td>
                  <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                    <div className="flex gap-1">
                      <button title="View Details" className="rounded-md p-2 text-slate-700 hover:bg-slate-100" onClick={() => setViewing(row)}>
                        <Eye size={16} />
                      </button>
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
                <td className="px-3 py-6 text-slate-500" colSpan={14}>
                  No released ORCR or plate records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing ? (
        <RecordFormModal
          title="Edit Released Record"
          columns={releaseEditColumns}
          values={editing}
          onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      ) : null}
      {viewing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Released ORCR / Plate Details</h3>
                <p className="mt-1 text-sm text-slate-500">{viewing.registered_name || viewing.plate_number}</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setViewing(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailRow label="Name" value={viewing.registered_name} />
              <DetailRow label="New Owner's Name" value={viewing.new_owner_name} />
              <DetailRow label="Plate Number" value={viewing.plate_number} />
              <DetailRow label="Engine Number" value={viewing.engine_number} />
              <DetailRow label="Chassis Number" value={viewing.chassis_number} />
              <DetailRow label="Motorcycle / Unit Type" value={viewing.motorcycle_unit_type} />
              <DetailRow label="Color" value={viewing.color} />
              <DetailRow label="ORCR Date Out" value={viewing.orcr_release_date} />
              <DetailRow label="Plate Date Out" value={viewing.plate_release_date} />
              <DetailRow label="ORCR Received By" value={receivedBy(viewing.orcr_release_method, viewing.orcr_received_by)} />
              <DetailRow label="Plate Received By" value={receivedBy(viewing.plate_release_method, viewing.plate_received_by)} />
            </div>
            <div className="flex justify-end border-t border-line px-5 py-4">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="Delete released record"
          message="This will permanently delete the selected ORCR / Plate record."
          onCancel={() => setDeleting(null)}
          onConfirm={deleteRow}
        />
      ) : null}
    </>
  );
}
