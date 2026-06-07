import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function listRecords(request: NextRequest, table: string, searchable: readonly string[]) {
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
  const supabase = getSupabaseAdmin();
  const payload = await request.json();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}

export async function updateRecord(request: NextRequest, table: string, id: string) {
  const supabase = getSupabaseAdmin();
  const payload = await request.json();
  const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data });
}

export async function deleteRecord(table: string, id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
