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

// Validate the days JSONB before it reaches the public share page / HTML
// export. Trip rows are user-writable (RLS only checks ownership), so the
// JSON can be poisoned with hostile values — wrong types, oversized strings,
// script payloads in numeric fields. This schema bounds every field; the
// export layer additionally coerces numbers (defense in depth).
const PLACE_ID = /^[A-Za-z0-9_-]{10,200}$/;

const SharedStop = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  address: z.string().max(300).optional().default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  time: z.string().max(10),
  durationMin: z.number().min(0).max(1440).default(60),
  blurb: z.string().max(600).optional().default(""),
  visitTip: z.string().max(300).nullable().optional(),
  category: z.string().max(30).optional().default(""),
  travelModeToNext: z.enum(["WALKING", "DRIVING", "TRANSIT"]).default("DRIVING"),
  placeId: z.string().regex(PLACE_ID).optional(),
});

const SharedDay = z.object({
  id: z.string().max(100),
  title: z.string().max(200),
  summary: z.string().max(1000).optional().default(""),
  stops: z.array(SharedStop).max(30),
});

const SharedDays = z.array(SharedDay).max(21);

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

    // Validate and sanitize the days payload before returning it.
    const daysResult = SharedDays.safeParse(r.days ?? []);
    if (!daysResult.success) {
      console.error("Shared trip failed validation:", daysResult.error.message);
      throw new Error("This trip couldn't be loaded.");
    }

    // Bound the top-level string fields too.
    const title = typeof r.title === "string" ? r.title.slice(0, 200) : "";
    const destination =
      typeof r.destination === "string" ? r.destination.slice(0, 200) : "";
    const countryCode =
      typeof r.country_code === "string" && /^[A-Z]{2}$/.test(r.country_code)
        ? r.country_code
        : undefined;

    // Note: promptText and focus are intentionally excluded from the public
    // response — prompts often contain personal details (hotel names, dates).
    return {
      id: r.id as string,
      title,
      destination,
      countryCode,
      days: daysResult.data as Trip["days"],
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  });
