export type OrcrPlateRecord = {
  id: string;
  registered_name: string;
  owner_name: string;
  motorcycle_unit_type: string;
  engine_number: string;
  chassis_number: string;
  orcr_on_hand: boolean;
  date_in: string | null;
  date_out: string | null;
  lbc_tracking_number: string;
  plate_number: string;
  plate_on_hand: boolean;
  remarks: string;
  created_at: string;
  updated_at: string;
};

export type SalesInvoiceRecord = {
  id: string;
  sales_invoice_number: string;
  registered_name: string;
  motorcycle_unit_type: string;
  engine_number: string;
  chassis_number: string;
  date_received: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryRecord = {
  id: string;
  motor_number: string;
  registered_name: string;
  motorcycle_model: string;
  color: string;
  year_model: string;
  odometer_reading: number | null;
  srp: number | null;
  costing: number | null;
  new_owner: string;
  claiming_orcr_status: "RECEIVED" | "INCOMPLETE" | "TEMPORARY" | "WALK IN" | "LBC" | "";
  exit_status: string;
  orcr_status: "COMPLETE" | "INCOMPLETE" | "PENDING" | "";
  plate_status: string;
  plate_number: string;
  main_status: "AVAILABLE" | "SOLD";
  created_at: string;
  updated_at: string;
};

export type ModuleKey = "orcr" | "sales" | "inventory";

export type ColumnDef<T> = {
  key: keyof T;
  label: string;
  type?: "text" | "date" | "boolean" | "number" | "money" | "status";
  options?: string[];
  required?: boolean;
};
