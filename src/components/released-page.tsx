"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { OrcrPlateRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/orcr")
      .then((response) => response.json())
      .then((body) => {
        setRows(body.data ?? []);
        setError(body.error ?? "");
      })
      .catch(() => setError("Unable to load released records."));
  }, []);

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
          row.plate_received_by
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
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Date Out</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Dropbox</th>
              <th className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">Plate Tracking / Received By</th>
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
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_date ?? "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.plate_release_method || "-"}</td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">{detail(row.plate_release_method, row.plate_lbc_tracking_number, row.plate_received_by)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={10}>
                  No released ORCR or plate records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
