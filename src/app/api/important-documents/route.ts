import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { parseImportantDocumentInput } from "@/lib/important-documents";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  const { data, error } = await getSupabaseAdmin()
    .from("important_documents")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const input = parseImportantDocumentInput(await request.json());
    const supabase = getSupabaseAdmin();
    const { data: lastDocument } = await supabase
      .from("important_documents")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("important_documents")
      .insert({ ...input, sort_order: Number(lastDocument?.sort_order ?? 0) + 1 })
      .select("*")
      .single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to add document.");
  }
}

