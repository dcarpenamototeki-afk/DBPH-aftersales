"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Package, ShieldCheck } from "lucide-react";
import { PageHeader } from "./page-header";

const cards = [
  ["totalOrcr", "Total ORCR Records", ClipboardCheck],
  ["activeOrcrMonitoring", "Active ORCR Monitoring", ShieldCheck],
  ["released", "Released ORCR / Plate", ClipboardCheck],
  ["totalInventory", "Total SB Finance Units", Package],
  ["available", "Available Inventory", Package],
  ["sold", "Sold Units", Package]
] as const;

export function Dashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((body) => (body.error ? setError(body.error) : setStats(body)))
      .catch(() => setError("Connect Supabase to load dashboard totals."));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" />
      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([key, label, Icon]) => (
          <div key={key} className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <Icon className="text-blue-600" size={20} />
            </div>
            <p className="text-3xl font-bold text-ink">{stats[key] ?? 0}</p>
          </div>
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
    </>
  );
}
