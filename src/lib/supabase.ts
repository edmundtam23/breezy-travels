import { createClient } from "@supabase/supabase-js";

function getUrl(): string {
  // Runtime (Cloudflare Workers via server.ts)
  const g = globalThis as unknown as Record<string, unknown> & {
    __env?: Record<string, unknown>;
  };
  return (
    (g.__env?.["VITE_SUPABASE_URL"] as string) ??
    (g["VITE_SUPABASE_URL"] as string) ??
    (import.meta.env.VITE_SUPABASE_URL as string) ??
    ""
  );
}

function getKey(): string {
  const g = globalThis as unknown as Record<string, unknown> & {
    __env?: Record<string, unknown>;
  };
  return (
    (g.__env?.["VITE_SUPABASE_ANON_KEY"] as string) ??
    (g["VITE_SUPABASE_ANON_KEY"] as string) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
    ""
  );
}

export const supabase = createClient(getUrl(), getKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
