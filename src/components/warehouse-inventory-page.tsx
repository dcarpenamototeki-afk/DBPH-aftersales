"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  CalendarClock,
  Download,
  FilePenLine,
  PackageMinus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import type { ColumnDef, WarehouseInventoryRecord } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { RecordFormModal } from "./record-form-modal";
import { StatusBadge } from "./status-badge";

type WarehouseName = WarehouseInventoryRecord["warehouse"];
type SortKey = "model" | "color" | "engine_number" | "chassis_number" | "orcr" | "status" | "date_out";
type SortState = { key: SortKey; direction: "asc" | "desc" };
type SummarySortKey = "model" | "color" | "db1" | "db2" | "total" | "cost" | "totalValue";
type SummarySortState = { key: SummarySortKey; direction: "asc" | "desc" };
type MonthlyReport = {
  id: string;
  report_year: number;
  report_month: number;
  generated_at: string;
};

const warehouses: WarehouseName[] = ["DB1 WAREHOUSE", "DB2 WAREHOUSE"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const sortableColumns: Array<{ key: SortKey; label: string }> = [
  { key: "model", label: "Model" },
  { key: "color", label: "Color" },
  { key: "engine_number", label: "Engine #" },
  { key: "chassis_number", label: "Chassis #" },
  { key: "orcr", label: "ORCR" },
  { key: "status", label: "Status" },
  { key: "date_out", label: "Date Out" }
];

const columns: ColumnDef<WarehouseInventoryRecord>[] = [
  { key: "warehouse", label: "Warehouse", type: "status", options: warehouses, required: true },
  { key: "model", label: "Model", required: true },
  { key: "color", label: "Color", required: true },
  { key: "engine_number", label: "Engine Number", required: true },
  { key: "chassis_number", label: "Chassis Number", required: true },
  { key: "orcr", label: "ORCR", type: "status", options: ["YES", "NO"], required: true }
];

function emptyRecord(warehouse: WarehouseName): Partial<WarehouseInventoryRecord> {
  return {
    warehouse,
    model: "",
    color: "",
    engine_number: "",
    chassis_number: "",
    orcr: "NO",
    cost: 0,
    status: "AVAIL",
    date_out: null
  };
}

function warehouseShortName(warehouse: WarehouseName) {
  return warehouse === "DB1 WAREHOUSE" ? "DB1" : "DB2";
}

function rowStatus(row: WarehouseInventoryRecord) {
  return row.status === "SOLD" ? "SOLD" : "AVAIL";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

export function WarehouseInventoryPage() {
  const [rows, setRows] = useState<WarehouseInventoryRecord[]>([]);
  const [warehouseSearches, setWarehouseSearches] = useState<Record<WarehouseName, string>>({
    "DB1 WAREHOUSE": "",
    "DB2 WAREHOUSE": ""
  });
  const [monthEndSearch, setMonthEndSearch] = useState("");
  const [editing, setEditing] = useState<Partial<WarehouseInventoryRecord> | null>(null);
  const [deleting, setDeleting] = useState<WarehouseInventoryRecord | null>(null);
  const [selling, setSelling] = useState<WarehouseInventoryRecord | null>(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [showSummary, setShowSummary] = useState(false);
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});
  const [savingCost, setSavingCost] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sorts, setSorts] = useState<Record<WarehouseName, SortState>>({
    "DB1 WAREHOUSE": { key: "model", direction: "asc" },
    "DB2 WAREHOUSE": { key: "model", direction: "asc" }
  });
  const [summarySort, setSummarySort] = useState<SummarySortState>({ key: "model", direction: "asc" });
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [downloadingReport, setDownloadingReport] = useState(0);
  const reportYear = new Date().getFullYear();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, reportsResponse] = await Promise.all([
        fetch("/api/warehouse-inventory?limit=2000"),
        fetch(`/api/warehouse-inventory/monthly-reports?year=${reportYear}`)
      ]);
      const [body, reportsBody] = await Promise.all([response.json(), reportsResponse.json()]);
      setRows(body.data ?? []);
      setMonthlyReports(reportsBody.data ?? []);
      setMessage(body.error ?? "");
    } catch {
      setMessage("Unable to load DBPH warehouse inventory.");
    } finally {
      setLoading(false);
    }
  }, [reportYear]);

  useEffect(() => {
    load();
  }, [load]);

  const availableRows = useMemo(() => rows.filter((row) => rowStatus(row) === "AVAIL"), [rows]);

  const summary = useMemo(() => {
    const counts = new Map<string, {
      key: string;
      model: string;
      color: string;
      total: number;
      db1: number;
      db2: number;
      cost: number;
      totalValue: number;
    }>();
    rows.forEach((row) => {
      const key = `${row.model}\u0000${row.color}`;
      const current = counts.get(key) ?? {
        key,
        model: row.model,
        color: row.color,
        total: 0,
        db1: 0,
        db2: 0,
        cost: Number(row.cost ?? 0),
        totalValue: 0
      };
      if (rowStatus(row) === "AVAIL") {
        current.total += 1;
        current.totalValue += Number(row.cost ?? 0);
        if (row.warehouse === "DB1 WAREHOUSE") current.db1 += 1;
        if (row.warehouse === "DB2 WAREHOUSE") current.db2 += 1;
      }
      counts.set(key, current);
    });

    return Array.from(counts.values())
      .sort((a, b) => {
        const aValue = a[summarySort.key];
        const bValue = b[summarySort.key];
        const comparison = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
        return summarySort.direction === "asc" ? comparison : -comparison;
      });
  }, [rows, summarySort]);

  const modelSummary = useMemo(() => {
    const counts = new Map<string, { model: string; colors: Set<string>; db1: number; db2: number; total: number }>();
    availableRows.forEach((row) => {
      const current = counts.get(row.model) ?? { model: row.model, colors: new Set<string>(), db1: 0, db2: 0, total: 0 };
      current.colors.add(row.color);
      current.total += 1;
      if (row.warehouse === "DB1 WAREHOUSE") current.db1 += 1;
      if (row.warehouse === "DB2 WAREHOUSE") current.db2 += 1;
      counts.set(row.model, current);
    });
    return Array.from(counts.values())
      .map((item) => ({ ...item, colorList: Array.from(item.colors).sort().join(", ") }))
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [availableRows]);

  const summaryTotals = useMemo(() => ({
    db1: availableRows.filter((row) => row.warehouse === "DB1 WAREHOUSE").length,
    db2: availableRows.filter((row) => row.warehouse === "DB2 WAREHOUSE").length,
    total: availableRows.length,
    totalValue: availableRows.reduce((sum, row) => sum + Number(row.cost ?? 0), 0)
  }), [availableRows]);

  const visibleSummary = useMemo(() => {
    const needle = monthEndSearch.trim().toLowerCase();
    if (!needle) return summary;
    return summary.filter((row) =>
      [row.model, row.color]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [monthEndSearch, summary]);

  const visibleSummaryTotals = useMemo(() => ({
    db1: visibleSummary.reduce((total, row) => total + row.db1, 0),
    db2: visibleSummary.reduce((total, row) => total + row.db2, 0),
    total: visibleSummary.reduce((total, row) => total + row.total, 0),
    totalValue: visibleSummary.reduce((total, row) => total + row.totalValue, 0)
  }), [visibleSummary]);

  const monthEndLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date())
    .toUpperCase();

  function toggleSort(warehouse: WarehouseName, key: SortKey) {
    setSorts((current) => {
      const existing = current[warehouse];
      return {
        ...current,
        [warehouse]: {
          key,
          direction: existing.key === key && existing.direction === "asc" ? "desc" : "asc"
        }
      };
    });
  }

  function toggleSummarySort(key: SummarySortKey) {
    setSummarySort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }

  function sortedWarehouseRows(warehouse: WarehouseName) {
    const sort = sorts[warehouse];
    const needle = warehouseSearches[warehouse].trim().toLowerCase();
    return rows
      .filter((row) => row.warehouse === warehouse)
      .filter((row) => !needle || [
        row.model,
        row.color,
        row.engine_number,
        row.chassis_number,
        row.orcr,
        rowStatus(row),
        row.date_out
      ].join(" ").toLowerCase().includes(needle))
      .sort((a, b) => {
        const aValue = sort.key === "status" ? rowStatus(a) : a[sort.key];
        const bValue = sort.key === "status" ? rowStatus(b) : b[sort.key];
        const comparison = String(aValue ?? "").localeCompare(String(bValue ?? ""), undefined, {
          numeric: true,
          sensitivity: "base"
        });
        return sort.direction === "asc" ? comparison : -comparison;
      });
  }

  async function save() {
    if (!editing) return;
    if (!editing.model || !editing.color || !editing.engine_number || !editing.chassis_number) {
      setMessage("Please complete the model, color, engine number, and chassis number.");
      return;
    }

    const original = editing.id ? rows.find((row) => row.id === editing.id) : null;
    const matchingGroup = rows.find((row) =>
      row.id !== editing.id &&
      row.model === editing.model &&
      row.color === editing.color
    );
    const groupChanged = Boolean(original && (original.model !== editing.model || original.color !== editing.color));
    const payload = {
      ...editing,
      cost: Number(matchingGroup?.cost ?? (groupChanged ? 0 : editing.cost ?? 0)),
      status: editing.status ?? "AVAIL",
      date_out: editing.status === "SOLD" ? editing.date_out : null
    };

    const response = await fetch(editing.id ? `/api/warehouse-inventory/${editing.id}` : "/api/warehouse-inventory", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to save warehouse unit.");
      return;
    }
    setEditing(null);
    setMessage("Warehouse unit saved.");
    await load();
  }

  async function remove() {
    if (!deleting) return;
    const response = await fetch(`/api/warehouse-inventory/${deleting.id}`, { method: "DELETE" });
    const body = await response.json();
    setDeleting(null);
    setMessage(body.error ?? "Warehouse unit deleted.");
    await load();
  }

  async function transfer(row: WarehouseInventoryRecord) {
    if (rowStatus(row) === "SOLD") return;
    const target: WarehouseName = row.warehouse === "DB1 WAREHOUSE" ? "DB2 WAREHOUSE" : "DB1 WAREHOUSE";
    const response = await fetch(`/api/warehouse-inventory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouse: target })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to transfer warehouse unit.");
      return;
    }
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, warehouse: target } : item));
    setMessage(`${row.model} transferred to ${warehouseShortName(target)} Warehouse.`);
  }

  async function markSold() {
    if (!selling || !saleDate) return;
    const response = await fetch(`/api/warehouse-inventory/${selling.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SOLD", date_out: saleDate })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to mark unit as sold.");
      return;
    }
    setSelling(null);
    setMessage(`${selling.model} marked as SOLD.`);
    await load();
  }

  async function markAvailable(row: WarehouseInventoryRecord) {
    const response = await fetch(`/api/warehouse-inventory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AVAIL", date_out: null })
    });
    const body = await response.json();
    setMessage(body.error ?? `${row.model} returned to available inventory.`);
    await load();
  }

  async function saveCost(item: (typeof summary)[number]) {
    const value = Number(costDrafts[item.key] ?? item.cost);
    if (!Number.isFinite(value) || value < 0) {
      setMessage("Cost must be zero or greater.");
      return;
    }
    setSavingCost(item.key);
    const response = await fetch("/api/warehouse-inventory/cost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: item.model, color: item.color, cost: value })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to update inventory cost.");
      setSavingCost("");
      return;
    }
    setRows((current) => current.map((row) =>
      row.model === item.model && row.color === item.color ? { ...row, cost: value } : row
    ));
    setCostDrafts((current) => {
      const next = { ...current };
      delete next[item.key];
      return next;
    });
    setSavingCost("");
    setMessage(`Cost updated for ${item.model} / ${item.color}.`);
  }

  function exportReport() {
    const currentRows = [...summary].sort((a, b) => a.model.localeCompare(b.model) || a.color.localeCompare(b.color));
    const soldRows = rows
      .filter((row) => rowStatus(row) === "SOLD")
      .sort((a, b) => String(b.date_out ?? "").localeCompare(String(a.date_out ?? "")));
    const report: unknown[][] = [
      ["DBPH WAREHOUSE INVENTORY REPORT"],
      ["Generated", new Date().toLocaleString("en-PH")],
      [],
      ["CURRENT INVENTORY SUMMARY"],
      ["Model", "Color", "DB1", "DB2", "Total MC", "Cost", "Total Value"],
      ...currentRows.map((item) => [item.model, item.color, item.db1, item.db2, item.total, item.cost, item.totalValue]),
      ["TOTAL", "", summaryTotals.db1, summaryTotals.db2, summaryTotals.total, "", summaryTotals.totalValue],
      [],
      ["SOLD UNITS LOG"],
      ["Date Out", "Warehouse", "Model", "Color", "Engine #", "Chassis #", "ORCR", "Cost"],
      ...soldRows.map((row) => [row.date_out ?? "", row.warehouse, row.model, row.color, row.engine_number, row.chassis_number, row.orcr, Number(row.cost ?? 0)])
    ];
    const csv = report.map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `DBPH_WH_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadMonthlyReport(month: number) {
    setDownloadingReport(month);
    try {
      const response = await fetch(`/api/warehouse-inventory/monthly-reports/${reportYear}/${month}`);
      if (!response.ok) {
        const body = await response.json();
        setMessage(body.error ?? "Unable to download monthly report.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `DBPH_WH_Monthly_Report_${reportYear}-${String(month).padStart(2, "0")}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Unable to download monthly report.");
    } finally {
      setDownloadingReport(0);
    }
  }

  return (
    <>
      <PageHeader title="DBPH WH Inventory">
        <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={() => setShowSummary(true)}>
          <BarChart3 size={16} />
          View Summary
        </button>
        <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={exportReport}>
          <Download size={16} />
          Export Report
        </button>
      </PageHeader>

      {message ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {warehouses.map((warehouse) => {
          const warehouseRows = sortedWarehouseRows(warehouse);
          const target = warehouse === "DB1 WAREHOUSE" ? "DB2" : "DB1";
          const activeSort = sorts[warehouse];
          return (
            <section key={warehouse} className="min-w-0 overflow-hidden border border-line bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-line bg-slate-100 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-ink">{warehouse}</h2>
                  <p className="text-xs text-slate-500">
                    {warehouseRows.length} displayed / {rows.filter((row) => row.warehouse === warehouse).length} records
                  </p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing(emptyRecord(warehouse))}>
                  <Plus size={16} />
                  Add Unit
                </button>
              </div>
              <div className="border-b border-line bg-white p-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
                  <input
                    className="w-full pl-9"
                    placeholder={`Search ${warehouseShortName(warehouse)} model, color, engine, chassis, status, or date`}
                    value={warehouseSearches[warehouse]}
                    onChange={(event) => setWarehouseSearches((current) => ({
                      ...current,
                      [warehouse]: event.target.value
                    }))}
                  />
                </label>
              </div>

              <div className="table-scroll max-h-[480px] overflow-auto">
                <table className="min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white text-xs uppercase text-slate-600">
                    <tr>
                      {sortableColumns.map((column) => (
                        <th key={column.key} className="border-b border-line px-3 py-3">
                          <button className="inline-flex items-center gap-1 font-semibold uppercase hover:text-blue-700" title={`Sort by ${column.label}`} onClick={() => toggleSort(warehouse, column.key)}>
                            {column.label}
                            {activeSort.key !== column.key ? <ArrowUpDown size={13} /> : activeSort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                          </button>
                        </th>
                      ))}
                      <th className="sticky right-0 border-b border-line bg-white px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={8}>Loading units...</td></tr>
                    ) : warehouseRows.length ? warehouseRows.map((row) => {
                      const status = rowStatus(row);
                      return (
                        <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                          <td className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{row.model}</td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.color}</td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.engine_number}</td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.chassis_number}</td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.orcr} /></td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={status} /></td>
                          <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.date_out || "-"}</td>
                          <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                            <div className="flex gap-1">
                              <button disabled={status === "SOLD"} title={`Transfer to ${target} Warehouse`} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-25" onClick={() => transfer(row)}><ArrowLeftRight size={16} /></button>
                              {status === "AVAIL" ? (
                                <button title="Mark Sold" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setSelling(row)}><PackageMinus size={16} /></button>
                              ) : (
                                <button title="Return to Available" className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => markAvailable(row)}><RotateCcw size={16} /></button>
                              )}
                              <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                              <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={8}>No units in this warehouse.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-5 grid items-start gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
      <section className="overflow-hidden border border-line bg-white shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-yellow-300 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold italic text-ink">DREAMBIKE PH</h2>
            <p className="mt-1 text-sm font-semibold text-ink">Month End Inventory {monthEndLabel}</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-500" size={17} />
            <input
              className="w-full border-yellow-500 bg-white pl-9"
              placeholder="Search month-end model or color"
              value={monthEndSearch}
              onChange={(event) => setMonthEndSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll overflow-auto">
          <table className="min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-700">
              <tr>
                <th className="border-b border-r border-line px-3 py-3" rowSpan={2}>
                  <button className="inline-flex items-center gap-1 font-semibold uppercase" onClick={() => toggleSummarySort("model")}>
                    Model
                    {summarySort.key !== "model" ? <ArrowUpDown size={13} /> : summarySort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  </button>
                </th>
                <th className="border-b border-r border-line px-3 py-3" rowSpan={2}>
                  <button className="inline-flex items-center gap-1 font-semibold uppercase" onClick={() => toggleSummarySort("color")}>
                    Color
                    {summarySort.key !== "color" ? <ArrowUpDown size={13} /> : summarySort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                  </button>
                </th>
                <th className="border-b border-r border-line px-3 py-2 text-center" colSpan={2}>Beginning Inventory</th>
                {[
                  ["total", "Total MC"],
                  ["cost", "Cost"],
                  ["totalValue", "Total Value"]
                ].map(([key, label]) => (
                  <th key={key} className="border-b border-r border-line px-3 py-3 text-center" rowSpan={2}>
                    <button className="inline-flex items-center gap-1 font-semibold uppercase" onClick={() => toggleSummarySort(key as SummarySortKey)}>
                      {label}
                      {summarySort.key !== key ? <ArrowUpDown size={13} /> : summarySort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                    </button>
                  </th>
                ))}
              </tr>
              <tr>
                {[
                  ["db1", "DB1"],
                  ["db2", "DB2"]
                ].map(([key, label]) => (
                  <th key={key} className="border-b border-r border-line px-3 py-2 text-center">
                    <button className="inline-flex items-center gap-1 font-semibold uppercase" onClick={() => toggleSummarySort(key as SummarySortKey)}>
                      {label}
                      {summarySort.key !== key ? <ArrowUpDown size={13} /> : summarySort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSummary.length ? visibleSummary.map((item) => (
                <tr key={item.key} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b border-r border-line px-3 py-2 font-semibold text-ink">{item.model}</td>
                  <td className="border-b border-r border-line px-3 py-2">{item.color}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center">{item.db1}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center">{item.db2}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center font-semibold">{item.total}</td>
                  <td className="border-b border-r border-line px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        className="w-32 text-right"
                        min="0"
                        step="0.01"
                        type="number"
                        value={costDrafts[item.key] ?? String(item.cost)}
                        onChange={(event) => setCostDrafts((current) => ({ ...current, [item.key]: event.target.value }))}
                      />
                      <button disabled={savingCost === item.key} title="Save Cost" className="rounded-md p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-40" onClick={() => saveCost(item)}><Save size={15} /></button>
                    </div>
                  </td>
                  <td className="border-b border-line px-3 py-2 text-right font-semibold">{formatMoney(item.totalValue)}</td>
                </tr>
              )) : (
                <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>No available warehouse units yet.</td></tr>
              )}
              <tr className="bg-yellow-100 font-bold text-ink">
                <td className="border-r border-line px-3 py-3" colSpan={2}>TOTAL</td>
                <td className="border-r border-line px-3 py-3 text-center">{visibleSummaryTotals.db1}</td>
                <td className="border-r border-line px-3 py-3 text-center">{visibleSummaryTotals.db2}</td>
                <td className="border-r border-line px-3 py-3 text-center">{visibleSummaryTotals.total}</td>
                <td className="border-r border-line px-3 py-3 text-center">-</td>
                <td className="px-3 py-3 text-right">{formatMoney(visibleSummaryTotals.totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-blue-700" size={18} />
            <h2 className="font-semibold text-ink">Monthly Report {reportYear}</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Reports become available after the month-end snapshot.</p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-slate-600">
              <tr>
                <th className="border-b border-line px-4 py-3">Month</th>
                <th className="border-b border-line px-3 py-3">Status</th>
                <th className="border-b border-line px-3 py-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody>
              {monthNames.map((monthName, index) => {
                const month = index + 1;
                const report = monthlyReports.find((item) => item.report_month === month);
                return (
                  <tr key={monthName} className="odd:bg-white even:bg-slate-50">
                    <td className="border-b border-line px-4 py-2.5 font-medium text-ink">{monthName}</td>
                    <td className="border-b border-line px-3 py-2.5">
                      <span className={`font-semibold ${report ? "text-emerald-700" : "text-slate-400"}`}>
                        {report ? "Available" : "Pending"}
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      <button
                        disabled={!report || downloadingReport === month}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                        title={report ? `Download ${monthName} report` : `${monthName} report is not available yet`}
                        onClick={() => downloadMonthlyReport(month)}
                      >
                        <Download size={14} />
                        {downloadingReport === month ? "Preparing" : "Download"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {showSummary ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Available Units Per Model</h3>
                <p className="mt-1 text-sm text-slate-500">{availableRows.length} units across {modelSummary.length} models</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setShowSummary(false)}><X size={18} /></button>
            </div>
            <div className="overflow-auto p-5">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Model</th>
                    <th className="px-3 py-3">Available Colors</th>
                    <th className="px-3 py-3 text-center">DB1</th>
                    <th className="px-3 py-3 text-center">DB2</th>
                    <th className="px-3 py-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {modelSummary.length ? modelSummary.map((item) => (
                    <tr key={item.model} className="border-b border-line">
                      <td className="px-3 py-2 font-semibold text-ink">{item.model}</td>
                      <td className="px-3 py-2">{item.colorList}</td>
                      <td className="px-3 py-2 text-center">{item.db1}</td>
                      <td className="px-3 py-2 text-center">{item.db2}</td>
                      <td className="px-3 py-2 text-center font-semibold">{item.total}</td>
                    </tr>
                  )) : (
                    <tr><td className="px-3 py-6 text-slate-500" colSpan={5}>No available units yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {selling ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Mark Unit as Sold</h3>
                <p className="mt-1 text-sm text-slate-500">{selling.model} / {selling.engine_number}</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setSelling(null)}><X size={18} /></button>
            </div>
            <div className="p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">Date Out<input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setSelling(null)}>Cancel</button>
              <button className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white" onClick={markSold}>Mark Sold</button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? <RecordFormModal title="Warehouse Unit Details" columns={columns} values={editing} onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))} onClose={() => setEditing(null)} onSubmit={save} /> : null}
      {deleting ? <ConfirmDialog title="Delete warehouse unit" message={`Permanently delete ${deleting.model} with engine number ${deleting.engine_number}?`} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </>
  );
}
