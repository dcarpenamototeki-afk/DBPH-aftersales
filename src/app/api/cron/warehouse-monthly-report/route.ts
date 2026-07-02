import { NextRequest, NextResponse } from "next/server";
import { generateWarehouseMonthlyReport } from "@/lib/warehouse-monthly-report";

export const dynamic = "force-dynamic";

function manilaDateParts(date: Date) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(values.map((part) => [part.type, Number(part.value)]));
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const parts = manilaDateParts(now);
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  if (parts.day !== lastDay) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Not the last day of the month." });
  }

  try {
    const report = await generateWarehouseMonthlyReport(parts.year, parts.month);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate monthly report." },
      { status: 500 }
    );
  }
}
