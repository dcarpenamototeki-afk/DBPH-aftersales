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
  return NextResponse.json({ data });
}

export async function createRecord(request: NextRequest, table: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const payload = await request.json();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}

export async function updateRecord(request: NextRequest, table: string, id: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const payload = await request.json();
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data });
}

export async function deleteRecord(request: NextRequest, table: string, id: string) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
