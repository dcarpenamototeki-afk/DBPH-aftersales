import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { PDFDocument } from "pdf-lib";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { findHeaderIndex, getGoogleAuth, getReleaseSpreadsheetId, getSheetIds, normalizeSheetValue } from "@/lib/google-sheets";
import { mcReleaseConfig } from "@/lib/mc-release-config";
import type { McReleaseForm, MotorcycleCatalog, MotorcycleMatch } from "@/lib/mc-release-config";

export const dynamic = "force-dynamic";

const headerAliases = {
  unitCode: ["MOTORCYCLE UNIT CODE", "MOTORCYCLE CODE", "UNIT CODE", "MC UNIT CODE", "MC CODE", "ITEM ID"],
  unitModel: ["UNIT MODEL", "MODEL", "MOTORCYCLE MODEL", "MC MODEL"],
  engineNumber: ["ENGINE #", "ENGINE NO", "ENGINE NUMBER"],
  chassisNumber: ["CHASSIS #", "CHASSIS NO", "CHASSIS NUMBER"],
  color: ["COLOR", "COLOUR"]
};

function escapeSheetName(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

function columnIndex(column: string) {
  return column
    .toUpperCase()
    .split("")
    .reduce((index, character) => index * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function isChecked(value: unknown) {
  return ["TRUE", "YES", "1"].includes(normalizeSheetValue(value));
}

function flexibleHeaderIndex(headers: unknown[], aliases: string[]) {
  const exact = findHeaderIndex(headers, aliases);
  if (exact >= 0) return exact;

  const normalizeHeader = (value: unknown) =>
    normalizeSheetValue(value).replace(/[^A-Z0-9]+/g, " ").trim();
  const normalizedAliases = aliases.map(normalizeHeader).filter(Boolean);
  return headers.findIndex((header) => {
    const value = normalizeHeader(header);
    if (!value) return false;
    return normalizedAliases.some((alias) => {
      return value === alias || value.includes(alias) || alias.includes(value);
    });
  });
}

async function findMotorcycle(unitCode: string): Promise<MotorcycleMatch | null> {
  const catalog = await getMotorcycleCatalog();
  const target = normalizeSheetValue(unitCode);
  return catalog.motorcycles.find((motorcycle) => normalizeSheetValue(motorcycle.unitCode) === target) ?? null;
}

async function getMotorcycleCatalog(): Promise<MotorcycleCatalog> {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${escapeSheetName(mcReleaseConfig.stocksSheet)}!A:BZ`
  });
  const rows = response.data.values ?? [];
  if (!rows.length) return { models: [], motorcycles: [] };

  const headerRowIndex = rows.findIndex((row) => flexibleHeaderIndex(row, headerAliases.unitCode) >= 0);
  if (headerRowIndex < 0) throw new Error("Motorcycle Unit Code column was not found in MC Stocks In.");
  const headers = rows[headerRowIndex];
  const indexes = {
    unitCode: flexibleHeaderIndex(headers, headerAliases.unitCode),
    unitModel: columnIndex(mcReleaseConfig.stocksUnitModelColumn),
    engineNumber: flexibleHeaderIndex(headers, headerAliases.engineNumber),
    chassisNumber: flexibleHeaderIndex(headers, headerAliases.chassisNumber),
    color: flexibleHeaderIndex(headers, headerAliases.color),
    released: columnIndex(mcReleaseConfig.stockCheckboxColumn)
  };
  const motorcycles: MotorcycleMatch[] = [];
  const seenUnitCodes = new Set<string>();

  for (let index = mcReleaseConfig.stocksFirstDataRow - 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (isChecked(row[indexes.released])) continue;
    const unitCode = String(row[indexes.unitCode] ?? "").trim();
    const normalizedUnitCode = normalizeSheetValue(unitCode);
    if (!normalizedUnitCode || seenUnitCodes.has(normalizedUnitCode)) continue;
    seenUnitCodes.add(normalizedUnitCode);
    motorcycles.push({
      sourceRow: index + 1,
      unitCode,
      unitModel: indexes.unitModel >= 0 ? String(row[indexes.unitModel] ?? "") : "",
      engineNumber: indexes.engineNumber >= 0 ? String(row[indexes.engineNumber] ?? "") : "",
      chassisNumber: indexes.chassisNumber >= 0 ? String(row[indexes.chassisNumber] ?? "") : "",
      color: indexes.color >= 0 ? String(row[indexes.color] ?? "") : ""
    });
  }

  const models = Array.from(
    new Map(
      motorcycles
        .filter((motorcycle) => motorcycle.unitModel.trim())
        .map((motorcycle) => [normalizeSheetValue(motorcycle.unitModel), motorcycle.unitModel.trim()])
    ).values()
  );

  return { models, motorcycles };
}

async function findAvailableJournalRow(startRow: number = mcReleaseConfig.firstJournalRow) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const ranges = mcReleaseConfig.journalScanColumns.map(
    (column) => `${escapeSheetName(mcReleaseConfig.journalSheet)}!${column}${startRow}:${column}`
  );
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges
  });
  const columns = response.data.valueRanges ?? [];
  const longestColumn = Math.max(0, ...columns.map((range) => range.values?.length ?? 0));

  for (let offset = 0; offset <= longestColumn; offset += 1) {
    const occupied = columns.some((range) => String(range.values?.[offset]?.[0] ?? "").trim());
    if (!occupied) return startRow + offset;
  }

  return startRow + longestColumn + 1;
}

async function isJournalRowAvailable(row: number) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const ranges = mcReleaseConfig.journalScanColumns.map(
    (column) => `${escapeSheetName(mcReleaseConfig.journalSheet)}!${column}${row}`
  );
  const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges });
  return (response.data.valueRanges ?? []).every(
    (range) => !String(range.values?.[0]?.[0] ?? "").trim()
  );
}

async function reserveAvailableJournalRow() {
  let candidate: number = await findAvailableJournalRow();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await isJournalRowAvailable(candidate)) return candidate;
    candidate = await findAvailableJournalRow(candidate + 1);
  }

  throw new Error("Unable to reserve a blank MC Journal row. Please try again.");
}

async function writeRelease(form: McReleaseForm, motor: MotorcycleMatch, journalRow: number) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const journal = escapeSheetName(mcReleaseConfig.journalSheet);
  const stocks = escapeSheetName(mcReleaseConfig.stocksSheet);
  const fixed = mcReleaseConfig.fixedValues;
  const entries: Array<[string, string | boolean]> = [
    [`${stocks}!${mcReleaseConfig.stockCheckboxColumn}${motor.sourceRow}`, true],
    [`${journal}!A${journalRow}`, true],
    [`${journal}!U${journalRow}`, form.releaseDate],
    [`${journal}!V${journalRow}`, fixed.releaseStatus],
    [`${journal}!X${journalRow}`, form.unitCode],
    [`${journal}!AD${journalRow}`, fixed.releasedBy],
    [`${journal}!AE${journalRow}`, form.amount],
    [`${journal}!AF${journalRow}`, fixed.paymentType],
    [`${journal}!AL${journalRow}`, fixed.notApplicable],
    [`${journal}!AP${journalRow}`, true],
    [`${journal}!AQ${journalRow}`, true],
    [`${journal}!AR${journalRow}`, true],
    [`${journal}!AS${journalRow}`, true],
    [`${journal}!AU${journalRow}`, form.surname],
    [`${journal}!AV${journalRow}`, form.firstName],
    [`${journal}!AW${journalRow}`, form.middleName],
    [`${journal}!AX${journalRow}`, form.birthday],
    [`${journal}!AY${journalRow}`, form.cpNumber],
    [`${journal}!AZ${journalRow}`, form.addressLine],
    [`${journal}!BA${journalRow}`, form.barangay],
    [`${journal}!BB${journalRow}`, form.cityTown],
    [`${journal}!BC${journalRow}`, form.province],
    [`${journal}!BD${journalRow}`, fixed.notApplicable],
    [`${journal}!BE${journalRow}`, fixed.notApplicable],
    [`${journal}!BF${journalRow}`, fixed.branch],
    [`${journal}!BJ${journalRow}`, form.releaseDate],
    [`${journal}!BK${journalRow}`, form.amount],
    [`${journal}!BL${journalRow}`, fixed.notApplicable],
    [`${journal}!BM${journalRow}`, true],
    [`${journal}!BV${journalRow}`, true],
    [`${journal}!BX${journalRow}`, form.waiver],
    [`${journal}!BZ${journalRow}`, true]
  ];

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: entries.map(([range, value]) => ({ range, values: [[value]] }))
    }
  });
}

async function exportCombinedPdf() {
  const auth = getGoogleAuth();
  const spreadsheetId = getReleaseSpreadsheetId();
  const sheetIds = await getSheetIds();
  const accessToken = await auth.getAccessToken();
  const merged = await PDFDocument.create();

  for (const title of mcReleaseConfig.printableSheets) {
    const gid = sheetIds.get(normalizeSheetValue(title));
    if (gid === undefined || gid === null) throw new Error(`Printable sheet "${title}" was not found.`);

    const params = new URLSearchParams({
      format: "pdf",
      gid: String(gid),
      size: "A4",
      portrait: "true",
      fitw: "true",
      sheetnames: "false",
      printtitle: "false",
      pagenumbers: "false",
      gridlines: "false",
      fzr: "false"
    });
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params}`, {
      headers: { Authorization: `Bearer ${accessToken.token}` },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Unable to export "${title}" as PDF.`);

    const source = await PDFDocument.load(await response.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return merged.save();
}

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;
  const unitCode = request.nextUrl.searchParams.get("unitCode")?.trim();

  try {
    if (!unitCode) return NextResponse.json(await getMotorcycleCatalog());
    const motor = await findMotorcycle(unitCode);
    if (!motor) return jsonError("Motorcycle Unit Code was not found in MC Stocks In.", 404);
    return NextResponse.json({ motor });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to read motorcycle details.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const form = (await request.json()) as McReleaseForm;
    const required = ["unitCode", "releaseDate", "surname", "firstName", "birthday", "cpNumber", "addressLine", "barangay", "cityTown", "province", "amount"] as const;
    const missing = required.find((key) => !String(form[key] ?? "").trim());
    if (missing) return jsonError(`${missing} is required.`);

    const motor = await findMotorcycle(form.unitCode);
    if (!motor) return jsonError("Motorcycle Unit Code was not found in MC Stocks In.", 404);
    const journalRow = await reserveAvailableJournalRow();
    if (!(await isJournalRowAvailable(journalRow))) {
      return jsonError("The selected MC Journal row was used by another entry. Please submit again.", 409);
    }
    await writeRelease(form, motor, journalRow);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const pdf = await exportCombinedPdf();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="MC_Release_${form.unitCode}_${journalRow}.pdf"`,
        "X-Journal-Row": String(journalRow)
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate release documents.", 500);
  }
}
