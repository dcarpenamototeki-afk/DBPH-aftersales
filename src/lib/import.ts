import { moduleConfig } from "./schema";
import { boolFromSheet, normalizeHeader, numberFromSheet } from "./format";
import type { ModuleKey } from "./types";

const aliases: Record<string, string> = {
  registered_name: "registered_name",
  registered_names: "registered_name",
  name: "registered_name",
  owner_name: "owner_name",
  owners_name: "owner_name",
  motorcycle: "motorcycle_unit_type",
  unit_type: "motorcycle_unit_type",
  motorcycle_unit_type: "motorcycle_unit_type",
  engine: "engine_number",
  engine_no: "engine_number",
  engine_number: "engine_number",
  chassis: "chassis_number",
  chassis_no: "chassis_number",
  chassis_number: "chassis_number",
  orcr_on_hand: "orcr_on_hand",
  or_cr_on_hand: "orcr_on_hand",
  date_in: "date_in",
  plate: "plate_number",
  plate_number: "plate_number",
  date_received: "date_received",
  source_location: "source_location",
  source: "source_location",
  location_found: "source_location",
  status: "status",
  matched_registered_name: "matched_registered_name",
  matched_engine_number: "matched_engine_number",
  matched_chassis_number: "matched_chassis_number",
  matched_record_type: "matched_record_type",
  plate_on_hand: "plate_on_hand",
  remarks: "remarks",
  sales_invoice_number: "sales_invoice_number",
  si_number: "sales_invoice_number",
  invoice_number: "sales_invoice_number",
  motor_number: "motor_number",
  motor_no: "motor_number",
  motorcycle_model: "motorcycle_model",
  model: "motorcycle_model",
  color: "color",
  year_model: "year_model",
  odometer_reading: "odometer_reading",
  odo: "odometer_reading",
  srp: "srp",
  costing: "costing",
  new_owner: "new_owner",
  sold_date: "sold_date",
  sold_orcr_released: "sold_orcr_released",
  sold_plate_released: "sold_plate_released",
  sold_sb_finance_documents: "sold_sb_finance_documents",
  sold_for_too: "sold_for_too",
  main_status: "main_status"
};

export function mapImportRow(module: ModuleKey, row: Record<string, unknown>) {
  const config = moduleConfig[module];
  const out: Record<string, unknown> = {};
  const allowed = new Set(config.columns.map((column) => String(column.key)));

  Object.entries(row).forEach(([key, value]) => {
    const normalized = aliases[normalizeHeader(key)] ?? normalizeHeader(key);
    if (allowed.has(normalized)) out[normalized] = value;
  });

  config.columns.forEach((column) => {
    const key = String(column.key);
    if (column.type === "boolean") out[key] = boolFromSheet(out[key]);
    if (column.type === "number" || column.type === "money") out[key] = numberFromSheet(out[key]);
    if (column.type === "status" && typeof out[key] === "string") out[key] = String(out[key]).trim().toUpperCase();
    if (out[key] === undefined) {
      if (column.type === "boolean") out[key] = false;
      else if (column.type === "number" || column.type === "money") out[key] = null;
      else out[key] = "";
    }
  });

  if (module === "inventory" && !out.main_status) out.main_status = "AVAILABLE";
  if (module === "unidentifiedPlates" && !out.status) out.status = "UNTRACED";
  return out;
}

export function googleRowsToObjects(values: string[][]) {
  const [headers = [], ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, row[index] ?? ""]))
    );
}
