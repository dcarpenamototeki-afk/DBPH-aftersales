"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Download, FilePenLine, PackageCheck, Radar, Search, Trash2, X } from "lucide-react";
import { ColumnDef, UnidentifiedPlateRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { RecordFormModal } from "./record-form-modal";
import { ConfirmDialog } from "./confirm-dialog";
import { StatusBadge } from "./status-badge";

type Match = {
  unidentifiedRecordId: string;
  orcrRecordId: string;
  dateReceived: string | null;
  sourceLocation: string;
  registeredName: string;
  unit: string;
  engineNumber: string;
  chassisNumber: string;
  plateNumber: string;
  targetArea: string;
  alreadyAvailable: boolean;
};

const columns: ColumnDef<UnidentifiedPlateRecord>[] = [
  { key: "plate_number", label: "Plate Number", required: true },
  { key: "date_received", label: "Date Received", type: "date" },
  { key: "source_location", label: "Source / Location Found" },
  { key: "status", label: "Status", type: "status", options: ["UNTRACED", "MATCHED", "RELEASED"] },
  { key: "matched_registered_name", label: "Matched Registered Name" },
  { key: "matched_engine_number", label: "Matched Engine / Motor Number" },
  { key: "matched_chassis_number", label: "Matched Chassis Number" },
  { key: "matched_record_type", label: "Matched Record Type" },
  { key: "remarks", label: "Remarks" }
];

function emptyRecord(): Partial<UnidentifiedPlateRecord> {
  return {
    plate_number: "",
    date_received: new Date().toISOString().slice(0, 10),
    source_location: "",
    status: "UNTRACED",
    matched_registered_name: "",
    matched_engine_number: "",
    matched_chassis_number: "",
    matched_record_type: "",
    remarks: ""
  };
}

export function UnidentifiedPlatesPage() {
  const [rows, setRows] = useState<UnidentifiedPlateRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<UnidentifiedPlateRecord> | null>(null);
  const [deleting, setDeleting] = useState<UnidentifiedPlateRecord | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tracedCount, setTracedCount] = useState(0);
  const [tracing, setTracing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [releasing, setReleasing] = useState<UnidentifiedPlateRecord | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    release_date: new Date().toISOString().slice(0, 10),
    release_method: "LBC",
    lbc_tracking_number: "",
    received_by: "",
    remarks: ""
  });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/unidentified-plates?search=${encodeURIComponent(search)}`)
      .then((response) => response.json())
      .then((body) => {
        setRows(body.data ?? []);
        setError(body.error ?? "");
      })
      .catch(() => setError("Unable to load unidentified plates."));
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const untracedRows = rows.filter((row) => row.status === "UNTRACED");

  async function saveRecord() {
    if (!editing) return;
    const response = await fetch(editing.id ? `/api/unidentified-plates/${editing.id}` : "/api/unidentified-plates", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to save unidentified plate.");
      return;
    }
    setEditing(null);
    load();
  }

  async function deleteRecord() {
    if (!deleting) return;
    await fetch(`/api/unidentified-plates/${deleting.id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  async function traceAll() {
    setTracing(true);
    setError("");
    const response = await fetch("/api/plate-trace");
    const body = await response.json();
    setTracing(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to trace plates.");
      return;
    }
    setMatches((body.matches ?? []) as Match[]);
    setTracedCount(Number(body.tracedCount ?? 0));
    setShowMatches(true);
  }

  async function copyPlateNumbers(plateNumbers: string[]) {
    const uniquePlates = Array.from(new Set(plateNumbers.map((plate) => plate.trim()).filter(Boolean)));
    if (!uniquePlates.length) {
      setError("No plate numbers to copy.");
      return;
    }
    await navigator.clipboard.writeText(uniquePlates.join("\r\n"));
    setError(`${uniquePlates.length} plate number${uniquePlates.length === 1 ? "" : "s"} copied. Ready to paste in Notepad.`);
  }

  function downloadMatches(exported: Array<Record<string, unknown>>) {
    const headers = ["Plate Number", "Registered Name", "Engine Number", "Chassis Number", "Tagged In", "Status"];
    const csv = [
      headers,
      ...exported.map((row) => [row.plateNumber, row.registeredName, row.engineNumber, row.chassisNumber, row.taggedIn, row.status])
    ]
      .map((values) => values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `plate-trace-matches-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportMatches() {
    if (!matches.length) return;
    setExporting(true);
    setError("");
    const response = await fetch("/api/plate-trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matches: matches.map((match) => ({
          unidentifiedRecordId: match.unidentifiedRecordId,
          orcrRecordId: match.orcrRecordId
        }))
      })
    });
    const body = await response.json();
    setExporting(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to export traced matches.");
      return;
    }
    downloadMatches(body.data ?? []);
    setShowMatches(false);
    setMatches([]);
    setError(`${body.exportedCount ?? 0} matched plate number(s) exported and tagged as PLATE AVAILABLE.`);
    load();
  }

  async function saveRelease() {
    if (!releasing) return;
    const response = await fetch(`/api/unidentified-plates/${releasing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...releaseForm, status: "RELEASED" })
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Unable to release plate.");
      return;
    }

    const releasePayload = {
      registered_name: releasing.matched_registered_name || "UNIDENTIFIED PLATE",
      owner_name: "",
      motorcycle_unit_type: releasing.matched_record_type || "",
      color: "",
      engine_number: releasing.matched_engine_number || "",
      chassis_number: releasing.matched_chassis_number || "",
      orcr_on_hand: false,
      date_in: releasing.date_received,
      plate_number: releasing.plate_number,
      plate_on_hand: false,
      plate_release_date: releaseForm.release_date,
      plate_release_method: releaseForm.release_method,
      plate_lbc_tracking_number: releaseForm.release_method === "LBC" ? releaseForm.lbc_tracking_number : "",
      plate_received_by: releaseForm.release_method === "WALK IN" ? releaseForm.received_by : "",
      remarks: releaseForm.remarks || releasing.remarks
    };

    const existingOrcrId = releasing.matched_record_type === "ORCR / PLATE" ? releasing.matched_record_id : null;
    const releasedResponse = await fetch(existingOrcrId ? `/api/orcr/${existingOrcrId}` : "/api/orcr", {
      method: existingOrcrId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(releasePayload)
    });

    if (!releasedResponse.ok) {
      const body = await releasedResponse.json();
      setError(body.error ?? "Plate was marked released, but unable to add it to Released ORCR / Plate.");
      return;
    }

    setReleasing(null);
    load();
  }

  return (
    <>
      <PageHeader title="Unidentified Plates">
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={tracing} onClick={traceAll}>
            <Radar size={16} /> {tracing ? "Tracing..." : "Trace Match"}
          </button>
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing(emptyRecord())}>Add Plate</button>
        </div>
      </PageHeader>

      <div className="mb-4 rounded-lg border border-line bg-white p-3 shadow-soft">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input className="w-full pl-9" placeholder="Search plate number or matched owner" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}

      <div className="table-scroll max-h-[calc(100vh-240px)] overflow-auto rounded-lg border border-line bg-white shadow-soft">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">
                <span className="inline-flex items-center gap-2">
                  Plate Number
                  <button className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-50" onClick={() => copyPlateNumbers(untracedRows.map((row) => row.plate_number))} title="Copy all visible plate numbers" type="button"><Copy size={12} /> Copy</button>
                </span>
              </th>
              {["Date Received", "Source / Location", "Status", "Matched Owner", "Matched Engine / Motor", "Record Type", "Remarks"].map((header) => (
                <th key={header} className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">{header}</th>
              ))}
              <th className="sticky right-0 border-b border-line bg-slate-100 px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {untracedRows.length ? untracedRows.map((row) => (
              <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_number}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.date_received ?? "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.source_location}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.status} /></td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.matched_registered_name || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.matched_engine_number || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.matched_record_type || "-"}</td>
                <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.remarks}</td>
                <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                  <div className="flex gap-1">
                    <button title="Release plate" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => setReleasing(row)}><PackageCheck size={16} /></button>
                    <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                    <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="px-3 py-6 text-slate-500" colSpan={9}>No unidentified plates yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <RecordFormModal
          title="Plate Details"
          columns={columns}
          values={editing}
          onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))}
          onClose={() => setEditing(null)}
          onSubmit={saveRecord}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog title="Delete unidentified plate" message="This will permanently delete the selected plate record." onCancel={() => setDeleting(null)} onConfirm={deleteRecord} />
      ) : null}

      {showMatches ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Plate Trace Results</h3>
                <p className="mt-1 text-sm text-slate-500">Traced {tracedCount} unidentified plate(s). Found {new Set(matches.map((match) => match.unidentifiedRecordId)).size} matched plate(s).</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100" onClick={() => setShowMatches(false)}><X size={19} /></button>
            </div>
            {matches.length ? (
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      {["Plate Number", "Registered Name", "Unit", "Engine Number", "Matched In", "Current Plate Status"].map((header) => (
                        <th key={header} className="whitespace-nowrap border-b border-line px-3 py-3">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={`${match.unidentifiedRecordId}-${match.orcrRecordId}`} className="odd:bg-white even:bg-slate-50">
                        <td className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold text-ink">{match.plateNumber}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{match.registeredName || "-"}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{match.unit || "-"}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{match.engineNumber || "-"}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={match.targetArea} /></td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={match.alreadyAvailable ? "ALREADY AVAILABLE" : "WILL TAG AVAILABLE"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="p-6 text-sm text-slate-500">No matching plate number was found in ORCR / Plate Monitoring or Released ORCR.</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-slate-50 px-5 py-4">
              {matches.length ? (
                <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-blue-700" onClick={() => copyPlateNumbers(matches.map((match) => match.plateNumber))} type="button"><Copy size={16} /> Copy Plate Numbers</button>
              ) : null}
              <button className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium" disabled={exporting} onClick={() => setShowMatches(false)}>Cancel</button>
              {matches.length ? (
                <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={exporting} onClick={exportMatches}><Download size={16} /> {exporting ? "Exporting..." : "Export & Tag Available"}</button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {releasing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-ink">Release Plate {releasing.plate_number}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Date Out<input type="date" value={releaseForm.release_date} onChange={(event) => setReleaseForm((current) => ({ ...current, release_date: event.target.value }))} /></label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Dropbox<select value={releaseForm.release_method} onChange={(event) => setReleaseForm((current) => ({ ...current, release_method: event.target.value }))}><option value="LBC">LBC</option><option value="WALK IN">WALK IN</option></select></label>
            </div>
            <div className="mt-4">
              {releaseForm.release_method === "LBC" ? (
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">Tracking Number<input value={releaseForm.lbc_tracking_number} onChange={(event) => setReleaseForm((current) => ({ ...current, lbc_tracking_number: event.target.value }))} /></label>
              ) : (
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">Received By<input value={releaseForm.received_by} onChange={(event) => setReleaseForm((current) => ({ ...current, received_by: event.target.value }))} /></label>
              )}
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-medium text-slate-700">Remarks<textarea rows={3} value={releaseForm.remarks} onChange={(event) => setReleaseForm((current) => ({ ...current, remarks: event.target.value }))} /></label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setReleasing(null)}>Cancel</button>
              <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={saveRelease}>Save Release</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

