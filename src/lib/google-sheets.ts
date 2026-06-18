import { google } from "googleapis";
import { mcReleaseConfig } from "./mc-release-config";

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google Sheets service account credentials are missing.");

  return new google.auth.JWT({
    email,
    key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  });
}

export function getReleaseSpreadsheetId() {
  return process.env.MC_RELEASE_SPREADSHEET_ID ?? mcReleaseConfig.spreadsheetId;
}

export function normalizeSheetValue(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function findHeaderIndex(headers: unknown[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeSheetValue);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeSheetValue(header)));
}

export async function getSheetIds() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getReleaseSpreadsheetId();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title)"
  });

  return new Map(
    (response.data.sheets ?? []).map((sheet) => [
      normalizeSheetValue(sheet.properties?.title),
      sheet.properties?.sheetId
    ])
  );
}
