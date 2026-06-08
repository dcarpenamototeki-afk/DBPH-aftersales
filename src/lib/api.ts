import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAllowedUser(request: NextRequest) {
  const allowedUid = process.env.ALLOWED_USER_UID ?? "25f88fac-e5b9-4148-82cd-2762b7b9d607";
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: jsonError("Login required.", 401) };

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return { error: jsonError("Invalid login session.", 401) };
  if (data.user.id !== allowedUid) return { error: jsonError("This user is not allowed to access the system.", 403) };
  return { user: data.user };
}

function shouldPreserveText(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("url") ||
    normalized.includes("link") ||
    normalized.includes("id") ||
    normalized.includes("email") ||
    normalized.includes("date")
  );
}

export function normalizePayload(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map((item) => normalizePayload(item));
  if (!payload || typeof payload !== "object") return payload;

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => {
      if (typeof value === "string" && !shouldPreserveText(key)) return [key, value.trim().toUpperCase()];
      if (value && typeof value === "object") return [key, normalizePayload(value)];
      return [key, value];
    })
  );
}

async function writeActivityLog({
  table,
  recordId,
  action,
  user,
  oldData,
  newData
}: {
  table: string;
  recordId?: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  user: { id: string; email?: string | null };
  oldData?: unknown;
  newData?: unknown;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("activity_log").insert({
    table_name: table,
    record_id: recordId ?? null,
    action,
    changed_by: user.id,
    changed_by_email: user.email ?? "",
    old_data: oldData ?? null,
    new_data: newData ?? null
  });
}

export async function listRecords(request: NextRequest, table: string, searchable: readonly string[]) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 500);
  let query = supabase.from(table).select("*").order("updated_at", { ascending: false }).limit(limit);

  if (search) {
    query = query.or(searchable.map((field) => `${field}.ilike.%${search}%`).join(","));
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data: normalizePayload(data) });
}

export async function createRecord(request: NextRequest, table: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const payload = normalizePayload(await request.json()) as Record<string, unknown>;
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);
  await writeActivityLog({
    table,
    recordId: data?.id,
    action: "CREATE",
    user: auth.user,
    newData: normalizePayload(data)
  });
  return NextResponse.json({ data: normalizePayload(data) }, { status: 201 });
}

export async function updateRecord(request: NextRequest, table: string, id: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const payload = normalizePayload(await request.json()) as Record<string, unknown>;
  const { data: oldData } = await supabase.from(table).select("*").eq("id", id).single();
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, 500);
  await writeActivityLog({
    table,
    recordId: id,
    action: "UPDATE",
    user: auth.user,
    oldData: normalizePayload(oldData),
    newData: normalizePayload(data)
  });
  return NextResponse.json({ data: normalizePayload(data) });
}

export async function deleteRecord(request: NextRequest, table: string, id: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data: oldData } = await supabase.from(table).select("*").eq("id", id).single();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  await writeActivityLog({
    table,
    recordId: id,
    action: "DELETE",
    user: auth.user,
    oldData: normalizePayload(oldData)
  });
  return NextResponse.json({ ok: true });
}
