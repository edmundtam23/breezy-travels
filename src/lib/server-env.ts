import { createClient } from "@supabase/supabase-js";

// Shared server-side helpers for reading worker env bindings and building
// the Supabase service-role client. Extracted from itinerary.functions.ts
// and share.functions.ts, which each carried an identical copy.

export function readEnv(name: string): string | undefined {
  const g = globalThis as unknown as Record<string, unknown> & {
    __env?: Record<string, unknown>;
  };
  const fromBinding = g.__env?.[name];
  if (typeof fromBinding === "string") return fromBinding;
  if (typeof g[name] === "string") return g[name] as string;
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

// Returns a Supabase client using the service role key.
// This bypasses RLS and is required for writing to ai_rate_limits and for
// resolving public share links (both must work outside a user session).
// NEVER expose this client or its key to the browser.
export function getServiceClient() {
  const url = readEnv("VITE_SUPABASE_URL") ?? "";
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
