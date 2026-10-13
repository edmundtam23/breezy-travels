import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Trip } from "./types";

function readEnv(name: string): string | undefined {
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
// This bypasses RLS and is required for resolving public share links,
// which must work for viewers who aren't logged in.
// NEVER expose this client or its key to the browser.
function getServiceClient() {
  const url = readEnv("VITE_SUPABASE_URL") ?? "";
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

const GetSharedTripInput = z.object({
  token: z.string().min(1).max(200),
});

// Resolve a public share token to its trip. No login required —
// the unguessable token is the capability. Throws if the link
// is invalid or has been disabled by the owner.
export const getSharedTrip = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => GetSharedTripInput.parse(d))
  .handler(async ({ data }): Promise<Trip> => {
    const client = getServiceClient();

    const { data: share, error: shareError } = await client
      .from("trip_shares")
      .select("trip_id")
      .eq("token", data.token)
      .single();

    if (shareError || !share) {
      throw new Error("This share link is invalid or has been disabled.");
    }

    const { data: row, error: tripError } = await client
      .from("trips")
      .select("*")
      .eq("id", (share as { trip_id: string }).trip_id)
      .single();

    if (tripError || !row) {
      throw new Error("Trip not found.");
    }

    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      title: r.title as string,
      destination: r.destination as string,
      countryCode: (r.country_code as string) ?? undefined,
      days: (r.days ?? []) as Trip["days"],
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      promptText: (r.prompt_text as string) ?? undefined,
      focus: (r.focus as string) ?? undefined,
    };
  });
