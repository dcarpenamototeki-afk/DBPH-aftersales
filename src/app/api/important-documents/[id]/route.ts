import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { parseImportantDocumentInput } from "@/lib/important-documents";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAllowedUser(request);
  if (auth.error) return auth.error;

  try {
    const input = parseImportantDocumentInput(await request.json());
    const { data, error } = await getSupabaseAdmin()
      .from("important_documents")
      .update(input)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update document.");
  }
}

