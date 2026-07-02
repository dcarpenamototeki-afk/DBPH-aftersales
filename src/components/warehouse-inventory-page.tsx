"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, FilePenLine, Plus, Search, Trash2 } from "lucide-react";
import type { ColumnDef, WarehouseInventoryRecord } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PageHeader } from "./page-header";
import { RecordFormModal } from "./record-form-modal";
import { StatusBadge } from "./status-badge";

type WarehouseName = WarehouseInventoryRecord["warehouse"];

const warehouses: WarehouseName[] = ["DB1 WAREHOUSE", "DB2 WAREHOUSE"];

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
    orcr: "NO"
  };
}

function warehouseShortName(warehouse: WarehouseName) {
  return warehouse === "DB1 WAREHOUSE" ? "DB1" : "DB2";
}

export function WarehouseInventoryPage() {
  const [rows, setRows] = useState<WarehouseInventoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<WarehouseInventoryRecord> | null>(null);
  const [deleting, setDeleting] = useState<WarehouseInventoryRecord | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
    const counts = new Map<string, { total: number; db1: number; db2: number }>();
    rows.forEach((row) => {
      const current = counts.get(row.model) ?? { total: 0, db1: 0, db2: 0 };
      current.total += 1;
      if (row.warehouse === "DB1 WAREHOUSE") current.db1 += 1;
      if (row.warehouse === "DB2 WAREHOUSE") current.db2 += 1;
      counts.set(row.model, current);
    });
    return Array.from(counts.entries())
      .map(([model, count]) => ({ model, ...count }))
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [rows]);

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

      <section className="mb-4 border-y border-line bg-white px-4 py-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Units Per Model</h2>
            <p className="text-sm text-slate-500">
              {rows.length} total units: {rows.filter((row) => row.warehouse === "DB1 WAREHOUSE").length} in DB1 and {rows.filter((row) => row.warehouse === "DB2 WAREHOUSE").length} in DB2
            </p>
          </div>
          <label className="relative block w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} />
            <input className="w-full pl-9" placeholder="Search model, color, engine, or chassis" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>

        <div className="max-h-44 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-center">DB1</th>
                <th className="px-3 py-2 text-center">DB2</th>
              </tr>
            </thead>
            <tbody>
              {summary.length ? summary.map((item) => (
                <tr key={item.model} className="border-b border-line">
                  <td className="px-3 py-2 font-semibold text-ink">{item.model}</td>
                  <td className="px-3 py-2 text-center">{item.total}</td>
                  <td className="px-3 py-2 text-center">{item.db1}</td>
                  <td className="px-3 py-2 text-center">{item.db2}</td>
                </tr>
              )) : (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={4}>No warehouse units yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {warehouses.map((warehouse) => {
          const warehouseRows = visibleRows.filter((row) => row.warehouse === warehouse);
          const target = warehouse === "DB1 WAREHOUSE" ? "DB2" : "DB1";
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

              <div className="table-scroll max-h-[calc(100vh-410px)] overflow-auto">
                <table className="min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white text-xs uppercase text-slate-600">
                    <tr>
                      <th className="border-b border-line px-3 py-3">Model</th>
                      <th className="border-b border-line px-3 py-3">Color</th>
                      <th className="border-b border-line px-3 py-3">Engine #</th>
                      <th className="border-b border-line px-3 py-3">Chassis #</th>
                      <th className="border-b border-line px-3 py-3">ORCR</th>
                      <th className="sticky right-0 border-b border-line bg-white px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>Loading units...</td></tr>
                    ) : warehouseRows.length ? warehouseRows.map((row) => (
                      <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                        <td className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{row.model}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.color}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.engine_number}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2">{row.chassis_number}</td>
                        <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge value={row.orcr} /></td>
                        <td className="sticky right-0 whitespace-nowrap border-b border-line bg-inherit px-3 py-2">
                          <div className="flex gap-1">
                            <button title={`Transfer to ${target} Warehouse`} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50" onClick={() => transfer(row)}><ArrowLeftRight size={16} /></button>
                            <button title="Edit" className="rounded-md p-2 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(row)}><FilePenLine size={16} /></button>
                            <button title="Delete" className="rounded-md p-2 text-rose-700 hover:bg-rose-50" onClick={() => setDeleting(row)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>No units in this warehouse.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {editing ? <RecordFormModal title="Warehouse Unit Details" columns={columns} values={editing} onChange={(key, value) => setEditing((current) => ({ ...(current ?? {}), [key]: value }))} onClose={() => setEditing(null)} onSubmit={save} /> : null}
      {deleting ? <ConfirmDialog title="Delete warehouse unit" message={`Permanently delete ${deleting.model} with engine number ${deleting.engine_number}?`} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </>
  );
}
