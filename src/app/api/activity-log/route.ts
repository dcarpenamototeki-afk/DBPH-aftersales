import { NextRequest, NextResponse } from "next/server";
import { requireAllowedUser } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (search) {
    query = query.or(`table_name.ilike.%${search}%,action.ilike.%${search}%,changed_by_email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
