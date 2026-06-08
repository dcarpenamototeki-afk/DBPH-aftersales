"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FilePenLine, Search, Trash2, X } from "lucide-react";
import { ColumnDef, OrcrPlateRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";

const releaseEditColumns: ColumnDef<OrcrPlateRecord>[] = [
  { key: "registered_name", label: "Registered Name" },
  { key: "motorcycle_unit_type", label: "Motorcycle / Unit Type" },
  { key: "plate_number", label: "Plate Number" },
  { key: "orcr_release_date", label: "ORCR Date Out", type: "date" },
  { key: "orcr_release_method", label: "ORCR Dropbox", type: "status", options: ["LBC", "WALK IN"] },
  { key: "orcr_lbc_tracking_number", label: "ORCR Tracking Number" },
  { key: "orcr_received_by", label: "ORCR Received By" },
  { key: "orcr_claimed_image_url", label: "ORCR Claimed Image Link" },
  { key: "plate_release_date", label: "Plate Date Out", type: "date" },
  { key: "plate_release_method", label: "Plate Dropbox", type: "status", options: ["LBC", "WALK IN"] },
  { key: "plate_lbc_tracking_number", label: "Plate Tracking Number" },
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

function detail(method: string, tracking: string, receivedBy: string) {
  if (method === "LBC") return tracking || "-";
  if (method === "WALK IN") return receivedBy || "-";
  return "-";
}

export function ReleasedPage() {
  const [rows, setRows] = useState<OrcrPlateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Partial<OrcrPlateRecord> | null>(null);
  const [deleting, setDeleting] = useState<OrcrPlateRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
          row.owner_name,
          row.motorcycle_unit_type,
          row.engine_number,
          row.chassis_number,
          row.plate_number,
          row.orcr_lbc_tracking_number,
          row.plate_lbc_tracking_number,
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
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Motorcycle</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Number</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Date Out</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Dropbox</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Tracking / Received By</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">ORCR Claimed</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Date Out</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Dropbox</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Tracking / Received By</th>
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
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.motorcycle_unit_type}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_number}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.orcr_release_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.orcr_release_method || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{detail(row.orcr_release_method, row.orcr_lbc_tracking_number, row.orcr_received_by)}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {row.orcr_claimed_image_url ? (
                      <button className="font-semibold text-blue-700 hover:underline" onClick={() => setPreviewUrl(row.orcr_claimed_image_url)}>IMAGE</button>
                    ) : "-"}
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_method || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{detail(row.plate_release_method, row.plate_lbc_tracking_number, row.plate_received_by)}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {row.plate_claimed_image_url ? (
                      <button className="font-semibold text-blue-700 hover:underline" onClick={() => setPreviewUrl(row.plate_claimed_image_url)}>IMAGE</button>
                    ) : "-"}
                  </td>
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
      {deleting ? (
        <ConfirmDialog
          title="Delete released record"
          message="This will permanently delete the selected ORCR / Plate record."
          onCancel={() => setDeleting(null)}
          onConfirm={deleteRow}
        />
      ) : null}
      {previewUrl ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-semibold text-ink">Claimed Image</h3>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setPreviewUrl("")}>
                <X size={18} />
              </button>
            </div>
            <div className="bg-slate-50 p-4">
              <img src={previewUrl} alt="Claimed document" className="mx-auto max-h-[70vh] max-w-full rounded-md object-contain" />
              <a className="mt-3 block text-center text-sm font-semibold text-blue-700 hover:underline" href={previewUrl} target="_blank" rel="noreferrer">
                Open image link
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
