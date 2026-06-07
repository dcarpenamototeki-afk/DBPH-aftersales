"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { InventoryRecord } from "@/lib/types";
import { PageHeader } from "./page-header";
import { StatusBadge } from "./status-badge";

export function SoldUnitsPage() {
  const [rows, setRows] = useState<InventoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/inventory")
      .then((response) => response.json())
      .then((body) => {
        setRows(body.data ?? []);
        setError(body.error ?? "");
      })
      .catch(() => setError("Unable to load sold units."));
  }, []);

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
                "For TOO"
              ].map((header) => (
                <th key={header} className="whitespace-nowrap border-b border-line px-3 py-3 font-semibold">
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
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={12}>
                  No sold units yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
