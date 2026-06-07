import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase public URL and anon key are required.");
  }

  return createClient(url, anonKey);
}

export function getSupabaseAdmin() {
  if (!url || !serviceKey) {
    throw new Error("Supabase URL and service role key are required for server writes.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function getBrowserSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public URL and anon key are required.");
  }

  if (!browserClient) {
    browserClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  return browserClient;
}
