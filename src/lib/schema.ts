import { ColumnDef, InventoryRecord, OrcrPlateRecord, SalesInvoiceRecord } from "./types";

export const orcrColumns: ColumnDef<OrcrPlateRecord>[] = [
  { key: "registered_name", label: "Registered Name", required: true },
  { key: "owner_name", label: "Owner Name" },
  { key: "motorcycle_unit_type", label: "Motorcycle / Unit Type" },
  { key: "engine_number", label: "Engine Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "orcr_on_hand", label: "ORCR on Hand", type: "boolean" },
  { key: "date_in", label: "Date In", type: "date" },
  { key: "plate_number", label: "Plate Number" },
  { key: "plate_on_hand", label: "Plate on Hand", type: "boolean" },
  { key: "remarks", label: "Remarks" }
];

export const salesColumns: ColumnDef<SalesInvoiceRecord>[] = [
  { key: "sales_invoice_number", label: "Sales Invoice Number", required: true },
  { key: "registered_name", label: "Registered Name" },
  { key: "motorcycle_unit_type", label: "Motorcycle Unit Type" },
  { key: "engine_number", label: "Engine Number" },
  { key: "chassis_number", label: "Chassis Number" },
  { key: "date_received", label: "Date Received", type: "date" }
];

export const inventoryColumns: ColumnDef<InventoryRecord>[] = [
  { key: "motor_number", label: "Motor Number", required: true },
  { key: "registered_name", label: "Registered Name" },
  { key: "motorcycle_model", label: "Motorcycle Model" },
  { key: "year_model", label: "Year Model" },
  { key: "color", label: "Color" },
  { key: "plate_number", label: "Plate Number" },
  { key: "odometer_reading", label: "Odometer Reading", type: "number" },
  { key: "srp", label: "SRP", type: "money" },
  { key: "costing", label: "Costing", type: "money" }
];

export const moduleConfig = {
  orcr: {
    title: "ORCR / Plate Monitoring",
    apiPath: "/api/orcr",
    table: "orcr_plate_records",
    duplicateKeys: ["engine_number", "chassis_number", "plate_number"],
    columns: orcrColumns,
    searchable: ["registered_name", "owner_name", "motorcycle_unit_type", "engine_number", "chassis_number", "plate_number"]
  },
  sales: {
    title: "Sales Invoice",
    apiPath: "/api/sales-invoices",
    table: "sales_invoice_records",
    duplicateKeys: ["sales_invoice_number", "engine_number", "chassis_number"],
    columns: salesColumns,
    searchable: ["sales_invoice_number", "registered_name", "motorcycle_unit_type", "engine_number", "chassis_number"]
  },
  inventory: {
    title: "SB Finance Inventory",
    apiPath: "/api/inventory",
    table: "sb_finance_inventory",
    duplicateKeys: ["motor_number", "plate_number"],
    columns: inventoryColumns,
    searchable: ["motor_number", "registered_name", "motorcycle_model", "new_owner", "plate_number"]
  }
} as const;
