import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAllowedUser } from "@/lib/api";
import { moduleConfig } from "@/lib/schema";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toCsv } from "@/lib/format";
import type { ModuleKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { module: ModuleKey } }) {
  const auth = await requireAllowedUser(_request);
  if (auth.error) return auth.error;

  const config = moduleConfig[params.module];
  if (!config) return jsonError("Unknown module.", 404);

  const { data, error } = await getSupabaseAdmin().from(config.table).select("*").order("updated_at", { ascending: false });
  if (error) return jsonError(error.message, 500);

  return new NextResponse(toCsv(data ?? []), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${params.module}-export.csv"`
    }
  });
}
