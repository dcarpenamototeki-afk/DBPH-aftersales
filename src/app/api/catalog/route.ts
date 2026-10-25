import { NextRequest, NextResponse } from "next/server";
import { jsonError, normalizePayload, requireAllowedUser, writeActivityLog } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const editableFields = [
  "title",
  "brand",
  "category",
  "engine_cc",
  "year_model",
  "odometer_km",
  "cash_price",
  "swapping_value",
  "image_url",
  "condition_notes",
  "is_available",
  "is_published"
] as const;

type EditableField = (typeof editableFields)[number];

function cleanPayload(input: unknown) {
  const normalized = normalizePayload(input) as Record<string, unknown>;
  const payload = Object.fromEntries(editableFields.map((field) => [field, normalized[field]])) as Record<EditableField, unknown>;
  const stringFields = ["title", "brand", "category", "year_model", "image_url", "condition_notes"] as const;
  stringFields.forEach((field) => {
    payload[field] = typeof payload[field] === "string" ? payload[field] : "";
  });
  ["engine_cc", "odometer_km", "cash_price", "swapping_value"].forEach((field) => {
    const value = payload[field as EditableField];
    payload[field as EditableField] = value === "" || value == null ? null : Number(value);
  });
  ["is_available", "is_published"].forEach((field) => {
    payload[field as EditableField] = Boolean(payload[field as EditableField]);
  });
  return payload;
}

export async function GET(request: NextRequest) {
  const adminScope = request.nextUrl.searchParams.get("scope") === "admin";
  if (adminScope) {
    const auth = await requireAllowedUser(request);
    if (auth.error) return auth.error;
  }

  let query = getSupabaseAdmin().from("catalog_items").select("*").order("updated_at", { ascending: false });
  if (!adminScope) query = query.eq("is_published", true).eq("is_available", true);
  const { data, error } = await query;

  if (error) {
    return adminScope ? jsonError(error.message, 500) : NextResponse.json({ data: [] });
  }
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;
  const payload = cleanPayload(await request.json());
  if (!String(payload.title).trim()) return jsonError("Unit title is required.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("catalog_items").insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);
  await writeActivityLog({ table: "catalog_items", recordId: data.id, action: "CREATE", user: auth.user, newData: data });
  return NextResponse.json({ data }, { status: 201 });
}
