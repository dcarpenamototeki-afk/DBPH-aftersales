"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FilePenLine, Search, Trash2, X } from "lucide-react";
import { ColumnDef, OrcrPlateRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";

const archiveYears = [2026, 2027, 2028, 2029, 2030];
const archiveMonths = [
  { value: "ALL", label: "ALL" },
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" }
];

function defaultArchiveYear() {
  const currentYear = new Date().getFullYear();
  return archiveYears.includes(currentYear) ? String(currentYear) : "2026";
}

function archivePeriod(row: OrcrPlateRecord) {
  if (!row.archive_year || !row.archive_month) return "-";
  const month = archiveMonths.find((item) => item.value === String(row.archive_month))?.label ?? String(row.archive_month);
  return `${month} ${row.archive_year}`;
}

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

function plateAvailability(row: OrcrPlateRecord) {
  if (row.orcr_release_date && row.plate_release_date) return "-";
  if (row.orcr_release_date) return row.plate_on_hand ? "READY" : "WAITING PLATE";
  if (row.plate_release_date) return row.orcr_on_hand ? "READY" : "WAITING ORCR";
  if (row.plate_on_hand && row.orcr_on_hand) return "READY";
  return "-";
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

function ReleasedRecordsTable({
  rows,
  loading = false,
  emptyMessage,
  onView,
  onEdit,
  onDelete
}: {
  rows: OrcrPlateRecord[];
  loading?: boolean;
  emptyMessage: string;
  onView: (row: OrcrPlateRecord) => void;
  onEdit?: (row: OrcrPlateRecord) => void;
  onDelete?: (row: OrcrPlateRecord) => void;
}) {
  return (
    <div className="max-h-[52vh] overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-white shadow-soft">
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs xl:text-sm">
        <colgroup>
          <col className="w-[9%]" /><col className="w-[11%]" /><col className="w-[20%]" />
          <col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[10%]" />
          <col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[9%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            {["Status", "Period", "Name", "Motorcycle", "Plate", "ORCR Released", "Plate Released", "Readiness", "Actions"].map((header) => (
              <th key={header} className="break-words border-b border-line px-2 py-3 font-semibold">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="px-3 py-6 text-slate-500" colSpan={9}>Loading records...</td></tr>
          ) : rows.length ? rows.map((row) => (
            <tr key={row.id} className="odd:bg-white even:bg-slate-50">
              <td className="break-words border-b border-line px-2 py-2"><StatusBadge value={releaseLabel(row)} /></td>
              <td className="break-words border-b border-line px-2 py-2">
                <p className="font-semibold text-ink">{archivePeriod(row)}</p>
                {row.is_archived ? <span className="mt-1 inline-flex"><StatusBadge value="ARCHIVED" /></span> : null}
              </td>
              <td className="break-words border-b border-line px-2 py-2">
                <p className="font-semibold text-ink">{row.registered_name || "-"}</p>
                {row.new_owner_name ? <p className="mt-1 text-slate-500">New: {row.new_owner_name}</p> : null}
              </td>
              <td className="break-words border-b border-line px-2 py-2">{row.motorcycle_unit_type || "-"}</td>
              <td className="break-words border-b border-line px-2 py-2 font-semibold">{row.plate_number || "-"}</td>
              <td className="break-words border-b border-line px-2 py-2"><p>{row.orcr_release_date ?? "-"}</p>{row.orcr_release_method ? <p className="mt-1 text-slate-500">{row.orcr_release_method}</p> : null}</td>
              <td className="break-words border-b border-line px-2 py-2"><p>{row.plate_release_date ?? "-"}</p>{row.plate_release_method ? <p className="mt-1 text-slate-500">{row.plate_release_method}</p> : null}</td>
              <td className="break-words border-b border-line px-2 py-2">{plateAvailability(row) === "-" ? "-" : <StatusBadge value={plateAvailability(row)} />}</td>
              <td className="border-b border-line px-2 py-2">
                <div className="flex flex-wrap gap-1">
                  <button title="View Details" className="rounded-md p-2 text-slate-700 hover:bg-slate-100" onClick={() => onView(row)}><Eye size={16} /></button>
                  {onEdit ? <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => onEdit(row)}><FilePenLine size={16} /></button> : null}
                  {onDelete ? <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => onDelete(row)}><Trash2 size={16} /></button> : null}
                </div>
              </td>
            </tr>
          )) : <tr><td className="px-3 py-6 text-slate-500" colSpan={9}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function ReleasedPage() {
  const [pendingRows, setPendingRows] = useState<OrcrPlateRecord[]>([]);
  const [archiveRows, setArchiveRows] = useState<OrcrPlateRecord[]>([]);
  const [archiveYear, setArchiveYear] = useState(defaultArchiveYear);
  const [archiveMonth, setArchiveMonth] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Partial<OrcrPlateRecord> | null>(null);
  const [deleting, setDeleting] = useState<OrcrPlateRecord | null>(null);
  const [viewing, setViewing] = useState<OrcrPlateRecord | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/released-archives?year=${archiveYear}&month=${archiveMonth}`)
      .then((response) => response.json())
      .then((body) => {
        setPendingRows(body.pending ?? []);
        setArchiveRows(body.archives ?? []);
        setError(body.error ?? "");
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load released archives.");
        setLoading(false);
      });
  }, [archiveMonth, archiveYear]);

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

  function downloadArchive() {
    if (!archiveRows.length) {
      setError("No released ORCR or plate records found for the selected archive period.");
      return;
    }

    const headers = [
      "Release Status",
      "Archive Period",
      "Archived At",
      "Registered Name",
      "New Owner's Name",
      "Motorcycle / Unit Type",
      "Color",
      "Engine Number",
      "Chassis Number",
      "Plate Number",
      "ORCR Date Out",
      "ORCR Mode of Claiming",
      "ORCR LBC Tracking Number",
      "ORCR Received By",
      "ORCR Claimed Image Link",
      "Plate Date Out",
      "Plate Mode of Claiming",
      "Plate LBC Tracking Number",
      "Plate Received By",
      "Plate Claimed Image Link",
      "Remarks"
    ];
    const values = archiveRows.map((row) => [
      releaseLabel(row),
      archivePeriod(row),
      row.archived_at,
      row.registered_name,
      row.new_owner_name,
      row.motorcycle_unit_type,
      row.color,
      row.engine_number,
      row.chassis_number,
      row.plate_number,
      row.orcr_release_date,
      row.orcr_release_method,
      row.orcr_lbc_tracking_number,
      row.orcr_received_by,
      row.orcr_claimed_image_url,
      row.plate_release_date,
      row.plate_release_method,
      row.plate_lbc_tracking_number,
      row.plate_received_by,
      row.plate_claimed_image_url,
      row.remarks
    ]);
    const csv = [headers, ...values]
      .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `released-orcr-plate-${archiveYear}-${archiveMonth.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = (row: OrcrPlateRecord) => {
      if (filter && releaseLabel(row) !== filter) return false;
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
    };
    return {
      pending: pendingRows.filter(matches),
      archives: archiveRows.filter(matches)
    };
  }, [archiveRows, pendingRows, search, filter]);

  return (
    <>
      <PageHeader title="Released ORCR / Plate">
        <div className="flex flex-wrap items-center gap-2">
          <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">
            Year
            <select value={archiveYear} onChange={(event) => setArchiveYear(event.target.value)}>
              {archiveYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">
            Month
            <select value={archiveMonth} onChange={(event) => setArchiveMonth(event.target.value)}>
              {archiveMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>
          <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} onClick={downloadArchive} type="button">
            <Download size={16} /> Download CSV
          </button>
        </div>
      </PageHeader>
      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Partially released records stay in Current Pending. Once both ORCR and plate are released, they automatically move to the archive month of final completion.
      </div>
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

      <section className="mb-6">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Current Pending for Release</h3>
            <p className="text-sm text-slate-500">Records with one released item and a remaining ORCR or plate.</p>
          </div>
          <span className="text-sm font-semibold text-slate-500">{filteredRecords.pending.length} record(s)</span>
        </div>
        <ReleasedRecordsTable
          rows={filteredRecords.pending}
          loading={loading}
          emptyMessage="No current records pending for release."
          onView={(row) => setViewing(row)}
          onEdit={(row) => setEditing(row)}
          onDelete={(row) => setDeleting(row)}
        />
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-ink">Released ORCR / Plate Archives</h3>
            <p className="text-sm text-slate-500">Fully released records for {archiveMonths.find((item) => item.value === archiveMonth)?.label} {archiveYear}.</p>
          </div>
          <span className="text-sm font-semibold text-slate-500">{filteredRecords.archives.length} record(s)</span>
        </div>
      <div className="max-h-[calc(100vh-230px)] overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs xl:text-sm">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[11%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Status</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Archive Period</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Name</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Motorcycle</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Plate</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">ORCR Released</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Plate Released</th>
              <th className="break-words border-b border-line px-2 py-3 font-semibold">Readiness</th>
              <th className="border-b border-line px-2 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={9}>Loading released archives...</td></tr>
            ) : filteredRecords.archives.length ? (
              filteredRecords.archives.map((row) => (
                <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                  <td className="break-words border-b border-line px-2 py-2"><StatusBadge value={releaseLabel(row)} /></td>
                  <td className="break-words border-b border-line px-2 py-2">
                    <p className="font-semibold text-ink">{archivePeriod(row)}</p>
                    {row.is_archived ? <span className="mt-1 inline-flex"><StatusBadge value="ARCHIVED" /></span> : null}
                  </td>
                  <td className="break-words border-b border-line px-2 py-2">
                    <p className="font-semibold text-ink">{row.registered_name || "-"}</p>
                    {row.new_owner_name ? <p className="mt-1 text-slate-500">New: {row.new_owner_name}</p> : null}
                  </td>
                  <td className="break-words border-b border-line px-2 py-2">{row.motorcycle_unit_type || "-"}</td>
                  <td className="break-words border-b border-line px-2 py-2 font-semibold">{row.plate_number || "-"}</td>
                  <td className="break-words border-b border-line px-2 py-2">
                    <p>{row.orcr_release_date ?? "-"}</p>
                    {row.orcr_release_method ? <p className="mt-1 text-slate-500">{row.orcr_release_method}</p> : null}
                  </td>
                  <td className="break-words border-b border-line px-2 py-2">
                    <p>{row.plate_release_date ?? "-"}</p>
                    {row.plate_release_method ? <p className="mt-1 text-slate-500">{row.plate_release_method}</p> : null}
                  </td>
                  <td className="break-words border-b border-line px-2 py-2">{plateAvailability(row) === "-" ? "-" : <StatusBadge value={plateAvailability(row)} />}</td>
                  <td className="border-b border-line px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button title="View Details" className="rounded-md p-2 text-slate-700 hover:bg-slate-100" onClick={() => setViewing(row)}>
                        <Eye size={16} />
                      </button>
                      {!row.is_archived ? (
                        <>
                          <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                          <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={9}>
                  No released ORCR or plate records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </section>
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
              <DetailRow label="Archive Period" value={archivePeriod(viewing)} />
              <DetailRow label="Archived At" value={viewing.archived_at} />
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

