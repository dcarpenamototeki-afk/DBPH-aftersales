import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const backupTables = [
  "orcr_plate_records",
  "sales_invoice_records",
  "sb_finance_inventory",
  "unidentified_plate_records",
  "too_status_records",
  "dbph_warehouse_inventory",
  "authorized_users",
  "activity_log"
] as const;

const optionalTables = new Set<string>(["authorized_users"]);
const pageSize = 1000;
const restoreChunkSize = 500;

async function readAllRows(table: string) {
  const supabase = getSupabaseAdmin();
  const rows: unknown[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) return { rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { rows, error: null };
    from += pageSize;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const tables: Record<string, unknown[]> = {};
  const warnings: string[] = [];

  for (const table of backupTables) {
    const result = await readAllRows(table);
    if (result.error) {
      if (optionalTables.has(table)) {
        warnings.push(`${table}: ${result.error.message}`);
        continue;
      }
      return jsonError(`Unable to back up ${table}: ${result.error.message}`, 500);
    }
    tables[table] = result.rows;
  }

  const exportedAt = new Date().toISOString();
  const backup = {
    backupType: "DBPH_SYSTEM_BACKUP",
    version: 1,
    exportedAt,
    exportedBy: auth.user.email ?? auth.user.id,
    tables,
    warnings
  };
  const fileDate = exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="DBPH_System_Backup_${fileDate}.json"`,
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  let backup: {
    backupType?: string;
    version?: number;
    tables?: Record<string, unknown>;
  };
  try {
    backup = await request.json();
  } catch {
    return jsonError("Backup file is not valid JSON.");
  }

  if (backup.backupType !== "DBPH_SYSTEM_BACKUP" || backup.version !== 1 || !backup.tables) {
    return jsonError("This is not a supported DBPH system backup.");
  }

  const supabase = getSupabaseAdmin();
  const restored: Record<string, number> = {};
  const warnings: string[] = [];

  for (const table of backupTables) {
    const tableRows = backup.tables[table];
    if (tableRows === undefined) continue;
    if (!Array.isArray(tableRows)) return jsonError(`Invalid data for ${table}.`);
    const rows = tableRows.filter((row) => row && typeof row === "object");

    for (let index = 0; index < rows.length; index += restoreChunkSize) {
      const chunk = rows.slice(index, index + restoreChunkSize);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
      if (error) {
        if (optionalTables.has(table)) {
          warnings.push(`${table}: ${error.message}`);
          break;
        }
        return jsonError(`Unable to restore ${table}: ${error.message}`, 500);
      }
    }
    restored[table] = rows.length;
  }

  return NextResponse.json({
    ok: true,
    restored,
    warnings
  });
}
