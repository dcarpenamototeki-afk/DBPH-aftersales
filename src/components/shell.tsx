"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileSpreadsheet, Import, Receipt, Warehouse } from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/orcr", label: "ORCR / Plate", icon: FileSpreadsheet },
  { href: "/sales-invoices", label: "Sales Invoice", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/import", label: "Import", icon: Import }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-line bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center border-b border-line px-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Internal Tracker</p>
            <h1 className="text-lg font-bold text-ink">Motorcycle Records</h1>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:block">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="w-full p-4 lg:ml-64 lg:p-6">{children}</main>
    </div>
  );
}
