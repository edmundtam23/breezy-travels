import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const g = globalThis as unknown as Record<string, unknown> & {
    __env?: Record<string, unknown>;
  };
  
  const url =
    (g.__env?.["SUPABASE_URL"] as string) ??
    (g["SUPABASE_URL"] as string) ??
    (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ??
    "";

  const key =
    (g.__env?.["SUPABASE_ANON_KEY"] as string) ??
    (g["SUPABASE_ANON_KEY"] as string) ??
    (typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY : undefined) ??
    "";

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = getSupabaseClient();
