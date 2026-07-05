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

function parseA1Range(range: string) {
  const match = range.toUpperCase().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid printable range: ${range}`);

  return {
    startRow: Number(match[2]) - 1,
    endRow: Number(match[4])
  };
}

function isChecked(value: unknown) {
  return ["TRUE", "YES", "1"].includes(normalizeSheetValue(value));
}

function sheetErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isProtectedCellError(error: unknown) {
  const message = sheetErrorMessage(error).toLowerCase();
  return message.includes("protected cell") || message.includes("protected range") || message.includes("protected cell or object");
}

function invalidDataIndex(error: unknown) {
  const match = sheetErrorMessage(error).match(/invalid data\[(\d+)\]/i);
  return match ? Number(match[1]) : -1;
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
    pnpCsrStatus: columnIndex(mcReleaseConfig.stocksPnpCsrStatusColumn),
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
      color: indexes.color >= 0 ? String(row[indexes.color] ?? "") : "",
      pnpCsrStatus: String(row[indexes.pnpCsrStatus] ?? "").trim()
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
  const uppercase = (value: string) => value.trim().toUpperCase();
  const entries: Array<[string, string | boolean]> = [
    [`${stocks}!${mcReleaseConfig.stockCheckboxColumn}${motor.sourceRow}`, true],
    [`${journal}!A${journalRow}`, true],
    [`${journal}!U${journalRow}`, form.releaseDate],
    [`${journal}!V${journalRow}`, uppercase(fixed.releaseStatus)],
    [`${journal}!X${journalRow}`, uppercase(form.unitCode)],
    [`${journal}!AD${journalRow}`, uppercase(fixed.releasedBy)],
    [`${journal}!AE${journalRow}`, form.amount],
    [`${journal}!AF${journalRow}`, uppercase(fixed.paymentType)],
    [`${journal}!AL${journalRow}`, uppercase(fixed.notApplicable)],
    [`${journal}!AP${journalRow}`, true],
    [`${journal}!AQ${journalRow}`, true],
    [`${journal}!AR${journalRow}`, true],
    [`${journal}!AS${journalRow}`, true],
    [`${journal}!AU${journalRow}`, uppercase(form.surname)],
    [`${journal}!AV${journalRow}`, uppercase(form.firstName)],
    [`${journal}!AW${journalRow}`, uppercase(form.middleName)],
    [`${journal}!AX${journalRow}`, form.birthday],
    [`${journal}!AY${journalRow}`, uppercase(form.cpNumber)],
    [`${journal}!AZ${journalRow}`, uppercase(form.addressLine)],
    [`${journal}!BA${journalRow}`, uppercase(form.barangay)],
    [`${journal}!BB${journalRow}`, uppercase(form.cityTown)],
    [`${journal}!BC${journalRow}`, uppercase(form.province)],
    [`${journal}!BD${journalRow}`, uppercase(fixed.notApplicable)],
    [`${journal}!BE${journalRow}`, uppercase(fixed.notApplicable)],
    [`${journal}!BF${journalRow}`, uppercase(fixed.branch)],
    [`${journal}!BJ${journalRow}`, form.releaseDate],
    [`${journal}!BK${journalRow}`, form.amount],
    [`${journal}!BL${journalRow}`, uppercase(fixed.notApplicable)],
    [`${journal}!BM${journalRow}`, true],
    [`${journal}!BV${journalRow}`, true],
    [`${journal}!BX${journalRow}`, uppercase(form.waiver)],
    [`${journal}!BZ${journalRow}`, true]
  ];
  const pending = [...entries];
  const skipped: string[] = [];

  while (pending.length) {
    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: pending.map(([range, value]) => ({ range, values: [[value]] }))
        }
      });
      return skipped;
    } catch (error) {
      const index = invalidDataIndex(error);
      const failedRange = pending[index]?.[0];
      if (!isProtectedCellError(error) || index < 0 || !failedRange) throw error;
      throw new Error(`Required sheet cell ${failedRange} is protected. Add the service account as an allowed editor for this protected range.`);
    }
  }

  return skipped;
}

async function rollbackRelease(journalRow: number, stockRow: number, unitCode: string) {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const journal = escapeSheetName(mcReleaseConfig.journalSheet);
  const stocks = escapeSheetName(mcReleaseConfig.stocksSheet);
  const unitCell = `${journal}!${mcReleaseConfig.journalLookupColumn}${journalRow}`;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: unitCell });
  const savedUnitCode = String(response.data.values?.[0]?.[0] ?? "");

  if (normalizeSheetValue(savedUnitCode) !== normalizeSheetValue(unitCode)) {
    throw new Error("Rollback stopped because the journal row no longer belongs to this Unit Code.");
  }

  const clearColumns = [
    mcReleaseConfig.journalLookupColumn,
    ...mcReleaseConfig.journalWrittenColumns.filter(
      (column) => column !== mcReleaseConfig.journalLookupColumn
    )
  ];
  for (const column of clearColumns) {
    const range = `${journal}!${column}${journalRow}`;
    try {
      await sheets.spreadsheets.values.clear({ spreadsheetId, range });
    } catch (error) {
      if (isProtectedCellError(error) && column !== mcReleaseConfig.journalLookupColumn) continue;
      throw error;
    }
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${stocks}!${mcReleaseConfig.stockCheckboxColumn}${stockRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[false]] }
  });
}

async function exportCombinedPdf() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const sheetIds = await getSheetIds();
  const accessToken = await auth.getAccessToken();
  const merged = await PDFDocument.create();

  for (let printableIndex = 0; printableIndex < mcReleaseConfig.printableSheets.length; printableIndex += 1) {
    const printable = mcReleaseConfig.printableSheets[printableIndex];
    const { title, scale, size, margin } = printable;
    const sourceSheetId = sheetIds.get(normalizeSheetValue(title));
    if (sourceSheetId === undefined || sourceSheetId === null) {
      throw new Error(`Printable sheet "${title}" was not found.`);
    }

    let gid = sourceSheetId;
    let temporarySheetId: number | null = null;

    if ("range" in printable && printable.range) {
      const bounds = parseA1Range(printable.range);
      const duplicate = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            duplicateSheet: {
              sourceSheetId,
              newSheetName: `__PRINT_${Date.now()}_${printableIndex}`
            }
          }]
        }
      });
      const properties = duplicate.data.replies?.[0]?.duplicateSheet?.properties;
      temporarySheetId = properties?.sheetId ?? null;
      const rowCount = properties?.gridProperties?.rowCount ?? bounds.endRow;
      if (temporarySheetId === null) throw new Error(`Unable to prepare printable sheet "${title}".`);
      gid = temporarySheetId;

      const requests: Array<Record<string, unknown>> = [];
      if (bounds.endRow < rowCount) {
        requests.push({
          deleteDimension: {
            range: {
              sheetId: temporarySheetId,
              dimension: "ROWS",
              startIndex: bounds.endRow,
              endIndex: rowCount
            }
          }
        });
      }
      if (bounds.startRow > 0) {
        requests.push({
          deleteDimension: {
            range: {
              sheetId: temporarySheetId,
              dimension: "ROWS",
              startIndex: 0,
              endIndex: bounds.startRow
            }
          }
        });
      }
      if (requests.length) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests }
        });
      }
    }

    try {
      const params = new URLSearchParams({
        format: "pdf",
        gid: String(gid),
        size,
        portrait: "true",
        scale,
        sheetnames: "false",
        printtitle: "false",
        pagenumbers: "false",
        gridlines: "false",
        fzr: "false",
        horizontal_alignment: "CENTER",
        vertical_alignment: "TOP",
        top_margin: margin,
        bottom_margin: margin,
        left_margin: margin,
        right_margin: margin
      });
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${params}`, {
        headers: { Authorization: `Bearer ${accessToken.token}` },
        cache: "no-store"
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/pdf")) {
        const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 180);
        throw new Error(`Unable to export "${title}" as PDF.${detail ? ` ${detail}` : ""}`);
      }

      const source = await PDFDocument.load(await response.arrayBuffer());
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    } finally {
      if (temporarySheetId !== null) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ deleteSheet: { sheetId: temporarySheetId } }]
          }
        });
      }
    }
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
    const skippedRanges = await writeRelease(form, motor, journalRow);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    let pdf: Uint8Array;
    try {
      pdf = await exportCombinedPdf();
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unable to generate release documents.",
          saved: true,
          journalRow,
          stockRow: motor.sourceRow,
          unitCode: form.unitCode,
          skippedRanges
        },
        { status: 502 }
      );
    }

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="MC_Release_${form.unitCode}_${journalRow}.pdf"`,
        "X-Journal-Row": String(journalRow),
        "X-Stock-Row": String(motor.sourceRow),
        "X-Skipped-Ranges": skippedRanges.join(",")
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate release documents.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const { journalRow, stockRow, unitCode } = (await request.json()) as {
      journalRow?: number;
      stockRow?: number;
      unitCode?: string;
    };
    if (!journalRow || journalRow < mcReleaseConfig.firstJournalRow || !stockRow || !unitCode) {
      return jsonError("Invalid revert request.");
    }

    await rollbackRelease(journalRow, stockRow, unitCode);

    return NextResponse.json({ ok: true, journalRow });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to revert the last record.", 500);
  }
}
