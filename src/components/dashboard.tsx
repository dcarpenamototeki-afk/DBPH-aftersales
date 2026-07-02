"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, Download, Package, ShieldCheck, Upload, Warehouse, X } from "lucide-react";
import { PageHeader } from "./page-header";
import { getBrowserSupabaseClient } from "@/lib/supabase";

const dashboardSections = [
  {
    title: "ORCR Monitoring",
    description: "Current ORCR and plate records",
    cards: [
      ["totalOrcr", "Total ORCR Records", ClipboardCheck],
      ["activeOrcrMonitoring", "Active Monitoring", ShieldCheck],
      ["released", "Released ORCR / Plate", ClipboardCheck]
    ]
  },
  {
    title: "SB Finance Units",
    description: "Inventory and sold-unit totals",
    cards: [
      ["totalInventory", "Total SB Finance Units", Package],
      ["available", "Available Inventory", Package],
      ["sold", "Sold Units", Package]
    ]
  },
  {
    title: "DBPH WH Inventory",
    description: "Available units across both warehouses",
    cards: [
      ["dbphWhTotal", "Total WH Units", Warehouse],
      ["dbphWh1", "DBPH WH1 Units", Warehouse],
      ["dbphWh2", "DBPH WH2 Units", Warehouse]
    ]
  }
] as const;

type SystemBackup = {
  backupType: "DBPH_SYSTEM_BACKUP";
  version: 1;
  exportedAt: string;
  tables: Record<string, unknown[]>;
};

export function Dashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingBackup, setPendingBackup] = useState<SystemBackup | null>(null);
  const [pendingBackupName, setPendingBackupName] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const loadStats = useCallback(async () => {
      const supabase = getBrowserSupabaseClient();
      const [orcr, inventory, warehouse] = await Promise.all([
        supabase.from("orcr_plate_records").select("orcr_release_date,plate_release_date"),
        supabase.from("sb_finance_inventory").select("main_status"),
        supabase.from("dbph_warehouse_inventory").select("warehouse,status")
      ]);

      if (orcr.error || inventory.error || warehouse.error) {
        setError(orcr.error?.message ?? inventory.error?.message ?? warehouse.error?.message ?? "Unable to load dashboard totals.");
        return;
      }

      const orcrRows = (orcr.data ?? []) as { orcr_release_date: string | null; plate_release_date: string | null }[];
      const inventoryRows = (inventory.data ?? []) as { main_status: string | null }[];
      const warehouseRows = (warehouse.data ?? []) as { warehouse: string; status: string | null }[];

      setStats({
        totalOrcr: orcrRows.length,
        activeOrcrMonitoring: orcrRows.filter((row) => !row.orcr_release_date && !row.plate_release_date).length,
        released: orcrRows.filter((row) => row.orcr_release_date || row.plate_release_date).length,
        totalInventory: inventoryRows.length,
        available: inventoryRows.filter((row) => row.main_status !== "SOLD").length,
        sold: inventoryRows.filter((row) => row.main_status === "SOLD").length,
        dbphWhTotal: warehouseRows.filter((row) => row.status !== "SOLD").length,
        dbphWh1: warehouseRows.filter((row) => row.warehouse === "DB1 WAREHOUSE" && row.status !== "SOLD").length,
        dbphWh2: warehouseRows.filter((row) => row.warehouse === "DB2 WAREHOUSE" && row.status !== "SOLD").length
      });
      setError("");
  }, []);

  useEffect(() => {
    loadStats().catch(() => setError("Connect Supabase to load dashboard totals."));
  }, [loadStats]);

  async function downloadBackup() {
    setDownloading(true);
    setBackupMessage("");
    try {
      const response = await fetch("/api/system-backup");
      if (!response.ok) {
        const body = await response.json();
        setBackupMessage(body.error ?? "Unable to download system backup.");
        return;
      }
      const blob = await response.blob();
      const match = (response.headers.get("content-disposition") ?? "").match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = match?.[1] ?? `DBPH_System_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupMessage("System backup downloaded.");
    } catch {
      setBackupMessage("Unable to download system backup.");
    } finally {
      setDownloading(false);
    }
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBackupMessage("");
    try {
      const parsed = JSON.parse(await file.text()) as SystemBackup;
      if (parsed.backupType !== "DBPH_SYSTEM_BACKUP" || parsed.version !== 1 || !parsed.tables) {
        setBackupMessage("The selected file is not a supported DBPH system backup.");
        return;
      }
      setPendingBackup(parsed);
      setPendingBackupName(file.name);
    } catch {
      setBackupMessage("The selected backup file is not valid JSON.");
    }
  }

  async function restoreBackup() {
    if (!pendingBackup) return;
    setRestoring(true);
    const response = await fetch("/api/system-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pendingBackup)
    });
    const body = await response.json();
    if (!response.ok) {
      setBackupMessage(body.error ?? "Unable to upload system backup.");
      setRestoring(false);
      return;
    }
    const restoredCount = Object.values(body.restored ?? {}).reduce((sum: number, value) => sum + Number(value), 0);
    setPendingBackup(null);
    setPendingBackupName("");
    setBackupMessage(`Backup uploaded. ${restoredCount} records merged.`);
    setRestoring(false);
    await loadStats();
  }

  return (
    <>
      <PageHeader title="Dashboard">
        <div className="flex flex-wrap gap-2">
          <button disabled={downloading} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50" onClick={downloadBackup}>
            <Download size={16} />
            {downloading ? "Preparing..." : "Download Backup"}
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => backupInputRef.current?.click()}>
            <Upload size={16} />
            Upload Backup
          </button>
          <input ref={backupInputRef} hidden accept=".json,application/json" type="file" onChange={selectBackup} />
        </div>
      </PageHeader>
      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
      {backupMessage ? <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{backupMessage}</div> : null}
      <div className="grid gap-5 xl:grid-cols-3">
        {dashboardSections.map((section) => (
          <section key={section.title} className="min-w-0 border-t-4 border-blue-600 bg-slate-100/70 p-4">
            <div className="mb-3">
              <h2 className="font-semibold text-ink">{section.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{section.description}</p>
            </div>
            <div className="grid gap-3">
              {section.cards.map(([key, label, Icon]) => (
                <div key={key} className="rounded-lg border border-line bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <Icon className="text-blue-600" size={19} />
                  </div>
                  <p className="text-3xl font-bold text-ink">{stats[key] ?? 0}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-line bg-white p-5 shadow-soft">
        <h3 className="mb-3 font-semibold text-ink">Workflow</h3>
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p>Use module pages to encode records, search names and unit numbers, and update ORCR or plate status.</p>
          <p>Use the import page to preview Google Sheet or CSV data before saving mapped rows to the database.</p>
          <p>Export each module to CSV for reports or print a filtered table from the browser.</p>
        </div>
      </div>

      {pendingBackup ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 className="font-semibold text-ink">Upload System Backup</h3>
                <p className="mt-1 text-sm text-slate-500">{pendingBackupName}</p>
              </div>
              <button aria-label="Close" className="rounded-md p-1 hover:bg-slate-100" onClick={() => setPendingBackup(null)}><X size={18} /></button>
            </div>
            <div className="p-5 text-sm text-slate-600">
              This will merge the backup records into the current system. Existing records with the same ID will be updated; other current records will remain.
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => setPendingBackup(null)}>Cancel</button>
              <button disabled={restoring} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={restoreBackup}>
                {restoring ? "Uploading..." : "Upload Backup"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
