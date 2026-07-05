export type OrcrPlateRecord = {
  id: string;
  registered_name: string;
  owner_name: string;
  motorcycle_unit_type: string;
  color: string;
  engine_number: string;
  chassis_number: string;
  orcr_on_hand: boolean;
  date_in: string | null;
  plate_number: string;
  plate_on_hand: boolean;
  orcr_release_date: string | null;
  orcr_release_method: "LBC" | "WALK IN" | "";
  orcr_lbc_tracking_number: string;
  orcr_received_by: string;
  orcr_claimed_image_url: string;
  plate_release_date: string | null;
  plate_release_method: "LBC" | "WALK IN" | "";
  plate_lbc_tracking_number: string;
  plate_received_by: string;
  plate_claimed_image_url: string;
  new_owner_name: string;
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
  year_model: string;
  color: string;
  plate_number: string;
  odometer_reading: number | null;
  srp: number | null;
  costing: number | null;
  sold_date: string | null;
  new_owner: string;
  sold_orcr_released: "CLAIMED" | "TO FOLLOW" | "";
  sold_plate_released: "CLAIMED" | "TO FOLLOW" | "";
  sold_sb_finance_documents: "CLAIMED" | "TO FOLLOW" | "";
  sold_for_too: boolean;
  main_status: "AVAILABLE" | "SOLD";
  created_at: string;
  updated_at: string;
};

export type UnidentifiedPlateRecord = {
  id: string;
  plate_number: string;
  date_received: string | null;
  source_location: string;
  status: "UNTRACED" | "MATCHED" | "RELEASED";
  matched_registered_name: string;
  matched_engine_number: string;
  matched_chassis_number: string;
  matched_record_type: string;
  matched_record_id: string | null;
  release_date: string | null;
  release_method: "LBC" | "WALK IN" | "";
  lbc_tracking_number: string;
  received_by: string;
  remarks: string;
  created_at: string;
  updated_at: string;
};

export type TooStatusRecord = {
  id: string;
  origin: "SWAP UNIT" | "PERSONAL BIKE" | "SINSKI" | "SB FINANCE";
  first_owner_name: string;
  new_owner_name: string;
  motorcycle_unit_type: string;
  color: string;
  engine_number: string;
  chassis_number: string;
  plate_number: string;
  date_received: string | null;
  data_check_status: "NOT CHECKED" | "NO MATCH" | "MATCHED & MOVED";
  matched_orcr_record_id: string | null;
  status: "IN PROCESS" | "RELEASED";
  release_date: string | null;
  remarks: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseInventoryRecord = {
  id: string;
  warehouse: "DB1 WAREHOUSE" | "DB2 WAREHOUSE";
  model: string;
  color: string;
  engine_number: string;
  chassis_number: string;
  orcr: "YES" | "NO";
  cost: number;
  status: "AVAIL" | "SOLD";
  date_out: string | null;
  customer_name: string;
  created_at: string;
  updated_at: string;
};

export type ModuleKey = "orcr" | "sales" | "inventory" | "unidentifiedPlates";

export type ColumnDef<T> = {
  key: keyof T;
  label: string;
  type?: "text" | "date" | "boolean" | "number" | "money" | "status";
  options?: string[];
  required?: boolean;
};
