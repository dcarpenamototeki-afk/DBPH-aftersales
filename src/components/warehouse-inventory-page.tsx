"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, ArrowUpDown, FilePenLine, Plus, Search, Trash2 } from "lucide-react";
import type { ColumnDef, WarehouseInventoryRecord } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { RecordFormModal } from "./record-form-modal";
import { StatusBadge } from "./status-badge";

type WarehouseName = WarehouseInventoryRecord["warehouse"];
type SortKey = "model" | "color" | "engine_number" | "chassis_number" | "orcr" | "cost";
type SortState = { key: SortKey; direction: "asc" | "desc" };
type SummarySortKey = "model" | "color" | "db1" | "db2" | "total" | "cost" | "totalValue";
type SummarySortState = { key: SummarySortKey; direction: "asc" | "desc" };

const warehouses: WarehouseName[] = ["DB1 WAREHOUSE", "DB2 WAREHOUSE"];
const sortableColumns: Array<{ key: SortKey; label: string }> = [
  { key: "model", label: "Model" },
  { key: "color", label: "Color" },
  { key: "engine_number", label: "Engine #" },
  { key: "chassis_number", label: "Chassis #" },
  { key: "orcr", label: "ORCR" },
  { key: "cost", label: "Cost" }
];

const columns: ColumnDef<WarehouseInventoryRecord>[] = [
  { key: "warehouse", label: "Warehouse", type: "status", options: warehouses, required: true },
  { key: "model", label: "Model", required: true },
  { key: "color", label: "Color", required: true },
  { key: "engine_number", label: "Engine Number", required: true },
  { key: "chassis_number", label: "Chassis Number", required: true },
  { key: "orcr", label: "ORCR", type: "status", options: ["YES", "NO"], required: true },
  { key: "cost", label: "Cost", type: "money", required: true }
];

function emptyRecord(warehouse: WarehouseName): Partial<WarehouseInventoryRecord> {
  return {
    warehouse,
    model: "",
    color: "",
    engine_number: "",
    chassis_number: "",
    orcr: "NO",
    cost: 0
  };
}

function warehouseShortName(warehouse: WarehouseName) {
  return warehouse === "DB1 WAREHOUSE" ? "DB1" : "DB2";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

export function WarehouseInventoryPage() {
  const [rows, setRows] = useState<WarehouseInventoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<WarehouseInventoryRecord> | null>(null);
  const [deleting, setDeleting] = useState<WarehouseInventoryRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sorts, setSorts] = useState<Record<WarehouseName, SortState>>({
    "DB1 WAREHOUSE": { key: "model", direction: "asc" },
    "DB2 WAREHOUSE": { key: "model", direction: "asc" }
  });
  const [summarySort, setSummarySort] = useState<SummarySortState>({ key: "model", direction: "asc" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warehouse-inventory?limit=2000");
      const body = await response.json();
      setRows(body.data ?? []);
      setMessage(body.error ?? "");
    } catch {
      setMessage("Unable to load DBPH warehouse inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const counts = new Map<string, { model: string; color: string; total: number; db1: number; db2: number; totalValue: number }>();
    rows.forEach((row) => {
      const key = `${row.model}\u0000${row.color}`;
      const current = counts.get(key) ?? { model: row.model, color: row.color, total: 0, db1: 0, db2: 0, totalValue: 0 };
      current.total += 1;
      current.totalValue += Number(row.cost ?? 0);
      if (row.warehouse === "DB1 WAREHOUSE") current.db1 += 1;
      if (row.warehouse === "DB2 WAREHOUSE") current.db2 += 1;
      counts.set(key, current);
    });
    return Array.from(counts.values())
      .map((item) => ({ ...item, cost: item.total ? item.totalValue / item.total : 0 }))
      .sort((a, b) => {
        const aValue = a[summarySort.key];
        const bValue = b[summarySort.key];
        const comparison = typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
        return summarySort.direction === "asc" ? comparison : -comparison;
      });
  }, [rows, summarySort]);

  const summaryTotals = useMemo(() => ({
    db1: rows.filter((row) => row.warehouse === "DB1 WAREHOUSE").length,
    db2: rows.filter((row) => row.warehouse === "DB2 WAREHOUSE").length,
    total: rows.length,
    totalValue: rows.reduce((sum, row) => sum + Number(row.cost ?? 0), 0)
  }), [rows]);

  const monthEndLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date())
    .toUpperCase();

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.model, row.color, row.engine_number, row.chassis_number, row.orcr]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, search]);

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
    return visibleRows
      .filter((row) => row.warehouse === warehouse)
      .sort((a, b) => {
        const comparison = String(a[sort.key] ?? "").localeCompare(String(b[sort.key] ?? ""), undefined, {
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

    const response = await fetch(editing.id ? `/api/warehouse-inventory/${editing.id}` : "/api/warehouse-inventory", {
      method: editing.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
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

  return (
    <>
      <PageHeader title="DBPH WH Inventory" />

      <div className="mb-4 rounded-lg border border-line bg-white p-3 shadow-soft">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
          <input className="w-full pl-9" placeholder="Search model, color, engine, or chassis" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </div>

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
                  <p className="text-xs text-slate-500">{warehouseRows.length} visible units</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setEditing(emptyRecord(warehouse))}>
                  <Plus size={16} />
                  Add Unit
                </button>
              </div>

              <div className="table-scroll max-h-[480px] overflow-auto">
                <table className="min-w-[860px] border-separate border-spacing-0 text-left text-sm">
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
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>Loading units...</td></tr>
                    ) : warehouseRows.length ? warehouseRows.map((row) => (
                      <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                        <td className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{row.model}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.color}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.engine_number}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.chassis_number}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.orcr} /></td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{formatMoney(Number(row.cost ?? 0))}</td>
                        <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                          <div className="flex gap-1">
                            <button title={`Transfer to ${target} Warehouse`} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => transfer(row)}><ArrowLeftRight size={16} /></button>
                            <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                            <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>No units in this warehouse.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-5 overflow-hidden border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-yellow-300 px-4 py-3">
          <h2 className="text-lg font-bold italic text-ink">DREAMBIKE PH</h2>
          <p className="mt-1 text-sm font-semibold text-ink">Month End Inventory {monthEndLabel}</p>
        </div>
        <div className="table-scroll overflow-auto">
          <table className="min-w-[820px] border-separate border-spacing-0 text-left text-sm">
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
              {summary.length ? summary.map((item) => (
                <tr key={`${item.model}-${item.color}`} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b border-r border-line px-3 py-2 font-semibold text-ink">{item.model}</td>
                  <td className="border-b border-r border-line px-3 py-2">{item.color}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center">{item.db1}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center">{item.db2}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-center font-semibold">{item.total}</td>
                  <td className="border-b border-r border-line px-3 py-2 text-right">{formatMoney(item.cost)}</td>
                  <td className="border-b border-line px-3 py-2 text-right font-semibold">{formatMoney(item.totalValue)}</td>
                </tr>
              )) : (
                <tr><td className="px-3 py-6 text-slate-500" colSpan={7}>No warehouse units yet.</td></tr>
              )}
              <tr className="bg-yellow-100 font-bold text-ink">
                <td className="border-r border-line px-3 py-3" colSpan={2}>TOTAL</td>
                <td className="border-r border-line px-3 py-3 text-center">{summaryTotals.db1}</td>
                <td className="border-r border-line px-3 py-3 text-center">{summaryTotals.db2}</td>
                <td className="border-r border-line px-3 py-3 text-center">{summaryTotals.total}</td>
                <td className="border-r border-line px-3 py-3 text-center">-</td>
                <td className="px-3 py-3 text-right">{formatMoney(summaryTotals.totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {editing ? <RecordFormModal title="Warehouse Unit Details" columns={columns} values={editing} onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))} onClose={() => setEditing(null)} onSubmit={save} /> : null}
      {deleting ? <ConfirmDialog title="Delete warehouse unit" message={`Permanently delete ${deleting.model} with engine number ${deleting.engine_number}?`} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </>
  );
}
