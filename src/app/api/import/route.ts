import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser } from "@/lib/api";
import { googleRowsToObjects, mapImportRow } from "@/lib/import";
import { moduleConfig } from "@/lib/schema";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ModuleKey } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchSheetValues(range = "A:Z", gid?: string) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is missing.");

  if (process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return response.data.values ?? [];
  }

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid ?? "1108835285"}`;
  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Sheet is not public. Configure Google service account credentials.");
  const text = await response.text();
  const Papa = await import("papaparse");
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  return parsed.data;
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const moduleKey = request.nextUrl.searchParams.get("module") as ModuleKey;
  const range = request.nextUrl.searchParams.get("range") ?? "A:Z";
  const gid = request.nextUrl.searchParams.get("gid") ?? undefined;
  if (!moduleConfig[moduleKey]) return jsonError("Unknown import module.", 404);

  try {
    const values = await fetchSheetValues(range, gid);
    const rows = googleRowsToObjects(values).map((row) => mapImportRow(moduleKey, row));
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to read Google Sheet.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const { module: moduleKey, rows } = (await request.json()) as { module: ModuleKey; rows: Record<string, unknown>[] };
  const config = moduleConfig[moduleKey];
  if (!config) return jsonError("Unknown import module.", 404);
  if (!Array.isArray(rows)) return jsonError("Rows must be an array.");

  const supabase = getSupabaseAdmin();
  const mapped = rows.map((row) => normalizePayload(mapImportRow(moduleKey, row)) as Record<string, unknown>);
  const kept: Record<string, unknown>[] = [];
  const skipped: Record<string, unknown>[] = [];

  for (const row of mapped) {
    const duplicateChecks = config.duplicateKeys
      .map((key) => [key, row[key]] as const)
      .filter(([, value]) => String(value ?? "").trim());

    if (duplicateChecks.length) {
      const orFilter = duplicateChecks
        .map(([key, value]) => `${key}.eq.${String(value).replace(/,/g, "\\,")}`)
        .join(",");
      const { data } = await supabase.from(config.table).select("id").or(orFilter).limit(1);
      if (data?.length) {
        skipped.push(row);
        continue;
      }
    }

    kept.push(row);
  }

  if (!kept.length) return NextResponse.json({ inserted: 0, skipped: skipped.length });
  const { error } = await supabase.from(config.table).insert(kept);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ inserted: kept.length, skipped: skipped.length });
}
