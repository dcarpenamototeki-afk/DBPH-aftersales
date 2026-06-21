"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronDown, FileCheck2, FileSignature, FileSpreadsheet, FileText, History, Import, PackageCheck, Radar, RefreshCcw, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { AuthGate } from "./auth-gate";
import { AccountMenu } from "./account-menu";

function NavLink({ href, label, icon: Icon, inset = false }: { href: string; label: string; icon: LucideIcon; inset?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
        inset && "ml-3",
        active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink"
      )}
    >
      <Icon size={17} />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen lg:flex">
        <aside className="border-b border-line bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="border-b border-line px-5 py-4">
            <Image src="/dreambike-logo.png" alt="Dreambike PH" width={220} height={56} className="h-12 w-full object-contain object-left" />
            <p className="mt-2 text-center text-xs font-bold tracking-[0.24em] text-slate-600">MONITORING SYSTEM</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:flex-1">
            <NavLink href="/" label="Dashboard" icon={BarChart3} />

          <details open className="mt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100">
              Dreambike PH
              <ChevronDown size={15} />
            </summary>
            <div className="mt-1 grid gap-1">
              <NavLink href="/orcr" label="ORCR / Plate Monitoring" icon={FileSpreadsheet} inset />
              <NavLink href="/released" label="Released ORCR / Plate" icon={PackageCheck} inset />
              <NavLink href="/unidentified-plates" label="Unidentified Plates" icon={Radar} inset />
              <NavLink href="/too-status" label="ToO Status" icon={RefreshCcw} inset />
              <NavLink href="/mc-release" label="BRISTOL MC Release" icon={FileCheck2} inset />
              <NavLink href="/create-ca" label="Create C.A" icon={FileSignature} inset />
            </div>
          </details>

          <details open className="mt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-100">
              SB Finance
              <ChevronDown size={15} />
            </summary>
            <div className="mt-1 grid gap-1">
              <NavLink href="/inventory" label="Inventory" icon={Warehouse} inset />
              <NavLink href="/sold-units" label="Sold Units" icon={PackageCheck} inset />
            </div>
          </details>

          <div className="mt-2">
            <NavLink href="/ltms-filler" label="LTMS Form Filler" icon={FileText} />
            <NavLink href="/import" label="Import" icon={Import} />
            <NavLink href="/audit-log" label="Audit Log" icon={History} />
            <AccountMenu />
          </div>
          </nav>
        </aside>
        <main className="w-full p-4 lg:ml-64 lg:p-6">{children}</main>
      </div>
    </AuthGate>
  );
}
