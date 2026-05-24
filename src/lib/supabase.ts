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
    // FIX: Use PKCE flow instead of the implicit grant default.
    // With implicit grant, Supabase puts the access_token in the URL hash
    // after OAuth redirect (#access_token=...&refresh_token=...), where it
    // can leak via browser history, referrer headers, or third-party scripts
    // that fire before Supabase consumes the hash.
    // PKCE exchanges a one-time code server-side instead — tokens never
    // appear in the URL. Supabase JS v2 handles all the mechanics automatically.
    flowType: "pkce",
  },
});