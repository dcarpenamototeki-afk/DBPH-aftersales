import { getSupabaseAdmin } from "./supabase";

type WarehouseRow = {
  warehouse: string;
  model: string;
  color: string;
  engine_number: string;
  chassis_number: string;
  orcr: string;
  cost: number | string | null;
  status: string | null;
  date_out: string | null;
};

export type WarehouseMonthlyReportData = {
  period: string;
  inventory: Array<{
    model: string;
    color: string;
    db1: number;
    db2: number;
    total: number;
    cost: number;
    totalValue: number;
  }>;
  totals: {
    db1: number;
    db2: number;
    total: number;
    totalValue: number;
  };
  sold: WarehouseRow[];
};

const pageSize = 1000;

async function readWarehouseRows() {
  const supabase = getSupabaseAdmin();
  const rows: WarehouseRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dbph_warehouse_inventory")
      .select("warehouse,model,color,engine_number,chassis_number,orcr,cost,status,date_out")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as WarehouseRow[]));
    if (!data || data.length < pageSize) return rows;
    from += pageSize;
  }
}

function reportPeriod(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function generateWarehouseMonthlyReport(year: number, month: number) {
  const rows = await readWarehouseRows();
  const groups = new Map<string, WarehouseMonthlyReportData["inventory"][number]>();

  for (const row of rows) {
    const key = `${row.model}\u0000${row.color}`;
    const current = groups.get(key) ?? {
      model: row.model,
      color: row.color,
      db1: 0,
      db2: 0,
      total: 0,
      cost: Number(row.cost ?? 0),
      totalValue: 0
    };
    if (row.status !== "SOLD") {
      current.total += 1;
      current.totalValue += Number(row.cost ?? 0);
      if (row.warehouse === "DB1 WAREHOUSE") current.db1 += 1;
      if (row.warehouse === "DB2 WAREHOUSE") current.db2 += 1;
    }
    groups.set(key, current);
  }

  const inventory = Array.from(groups.values())
    .sort((a, b) => a.model.localeCompare(b.model) || a.color.localeCompare(b.color));
  const period = reportPeriod(year, month);
  const sold = rows
    .filter((row) => row.status === "SOLD" && row.date_out?.slice(0, 7) === period)
    .sort((a, b) => String(a.date_out).localeCompare(String(b.date_out)));
  const totals = inventory.reduce(
    (result, row) => ({
      db1: result.db1 + row.db1,
      db2: result.db2 + row.db2,
      total: result.total + row.total,
      totalValue: result.totalValue + row.totalValue
    }),
    { db1: 0, db2: 0, total: 0, totalValue: 0 }
  );
  const reportData: WarehouseMonthlyReportData = { period, inventory, totals, sold };

  const { data, error } = await getSupabaseAdmin()
    .from("dbph_warehouse_monthly_reports")
    .upsert(
      { report_year: year, report_month: month, generated_at: new Date().toISOString(), report_data: reportData },
      { onConflict: "report_year,report_month" }
    )
    .select("id,report_year,report_month,generated_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

export function warehouseMonthlyReportCsv(data: WarehouseMonthlyReportData) {
  const report: unknown[][] = [
    ["DBPH WAREHOUSE MONTHLY REPORT"],
    ["Period", data.period],
    [],
    ["MONTH END INVENTORY"],
    ["Model", "Color", "DB1", "DB2", "Total MC", "Cost", "Total Value"],
    ...data.inventory.map((row) => [
      row.model,
      row.color,
      row.db1,
      row.db2,
      row.total,
      row.cost,
      row.totalValue
    ]),
    ["TOTAL", "", data.totals.db1, data.totals.db2, data.totals.total, "", data.totals.totalValue],
    [],
    ["UNITS SOLD DURING THE MONTH"],
    ["Date Out", "Warehouse", "Model", "Color", "Engine #", "Chassis #", "ORCR", "Cost"],
    ...data.sold.map((row) => [
      row.date_out,
      row.warehouse,
      row.model,
      row.color,
      row.engine_number,
      row.chassis_number,
      row.orcr,
      Number(row.cost ?? 0)
    ])
  ];
  return report.map((line) => line.map(csvCell).join(",")).join("\r\n");
}
