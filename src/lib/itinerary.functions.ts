import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  const g = globalThis as unknown as Record<string, unknown> & {
    __env?: Record<string, unknown>
  };
  const fromBinding = g.__env?.[name];
  if (typeof fromBinding === "string") return fromBinding;
  if (typeof g[name] === "string") return g[name] as string;
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return undefined;
}

// Verify a Supabase session token passed directly from the client.
async function requireAuth(token: string) {
  if (!token) {
    throw new Error("Unauthorized: you must be signed in to use this feature.");
  }
  const url = readEnv("VITE_SUPABASE_URL") ?? "";
  const key = readEnv("VITE_SUPABASE_ANON_KEY") ?? "";
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Unauthorized: you must be signed in to use this feature.");
  }
  return data.user;
}

// Returns a Supabase client using the service role key.
// This bypasses RLS and is required for writing to ai_rate_limits,
// which has no user-facing RLS policies by design.
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

// Per-user AI rate limiting constants.
// ITINERARY_COOLDOWN_MS: generateItinerary is expensive (multi-second Gemini call,
// structured JSON response). 30s cooldown prevents runaway hammering while
// still feeling responsive for normal use.
// BLURB_COOLDOWN_MS: generateBlurb is cheap but can be called in a loop
// (one per stop edit). 3s cooldown allows reasonable UX while limiting burst abuse.
const ITINERARY_COOLDOWN_MS = 30_000; // 30 seconds between itinerary generations
const BLURB_COOLDOWN_MS = 3_000;      // 3 seconds between blurb generations

type AiAction = "generateItinerary" | "generateBlurb";

// Checks whether the user is within the cooldown window for a given AI action.
// Uses an upsert so the first call always succeeds and sets the timestamp.
//
// Strategy: optimistic upsert — we write last_call_at = now() and action = action
// only when the cooldown has elapsed, using a conditional upsert. If the row
// was updated less than cooldown_ms ago, Postgres won't update it and returns
// the existing row so we can compute the wait time.
//
// We use two columns (one per action) so itinerary and blurb limits are
// tracked independently — a blurb call doesn't burn the itinerary cooldown.
async function checkAndRecordAiRateLimit(userId: string, action: AiAction): Promise<void> {
  const db = getServiceClient();
  const cooldownMs = action === "generateItinerary" ? ITINERARY_COOLDOWN_MS : BLURB_COOLDOWN_MS;
  const column = action === "generateItinerary" ? "last_itinerary_at" : "last_blurb_at";

  // Fetch the current record for this user (if any).
  const { data: existing, error: fetchError } = await db
    .from("ai_rate_limits")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    // If we can't read the rate limit table, fail open with a warning rather
    // than blocking the user. Log so we notice misconfiguration.
    console.error("ai_rate_limits fetch error (failing open):", fetchError.message);
    return;
  }

  if (existing) {
    const lastCallAt = existing[column as keyof typeof existing] as string | null;
    if (lastCallAt) {
      const elapsedMs = Date.now() - new Date(lastCallAt).getTime();
      if (elapsedMs < cooldownMs) {
        const waitSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        throw new Error(
          `Please wait ${waitSec} more second${waitSec === 1 ? "" : "s"} before generating another ${
            action === "generateItinerary" ? "itinerary" : "blurb"
          }.`
        );
      }
    }
  }

  // Record this call. upsert: insert if no row, update the relevant column if row exists.
  const { error: upsertError } = await db
    .from("ai_rate_limits")
    .upsert(
      { user_id: userId, [column]: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    // Non-fatal: log but don't block the user if the write fails.
    console.error("ai_rate_limits upsert error (failing open):", upsertError.message);
  }
}

export const getMapsApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth(data.token);
    const key = readEnv("GOOGLE_MAPS_API_KEY") ?? "";
    return { key };
  });

const StopSchema = z.object({
  name: z.string(),
  address: z.string().optional().default(""),
  lat: z.number(),
  lng: z.number(),
  time: z.string(),
  durationMin: z.number().default(60),
  blurb: z.string(),
  visitTip: z.string().nullable().optional().catch(null),
  category: z.string().optional().default(""),
  travelModeToNext: z.enum(["WALKING", "DRIVING", "TRANSIT"]).default("DRIVING"),
});

const DaySchema = z.object({
  title: z.string(),
  summary: z.string(),
  stops: z.array(StopSchema),
});

const ItinerarySchema = z.object({
  title: z.string(),
  destination: z.string(),
  days: z.array(DaySchema),
});

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey });
}

const GenerateItineraryInput = z.object({
  prompt: z.string().min(1).max(500).trim(),
  days: z.number().int().min(1).max(14),
  token: z.string().min(1),
});

const GenerateBlurbInput = z.object({
  name: z.string().min(1).max(200).trim(),
  destination: z.string().max(200).trim().optional(),
  token: z.string().min(1),
});

export const generateItinerary = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; days: number; token: string }) => GenerateItineraryInput.parse(d))
  .handler(async ({ data }) => {
    // 1. Verify the session is valid and get the user.
    const user = await requireAuth(data.token);

    // 2. Enforce per-user cooldown before touching Gemini.
    //    This runs after auth so anonymous callers never reach the rate limit check.
    await checkAndRecordAiRateLimit(user.id, "generateItinerary");

    const ai = getClient();

    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Plan a ${data.days}-day trip: ${data.prompt}\n\nReturn a structured itinerary with real, well-known points of interest and accurate latitude/longitude coordinates. Each day should have 4-6 stops. Times in HH:MM (24h). Blurbs should be 1-2 sentences. Choose appropriate travel modes (WALKING for stops within 1km, TRANSIT for urban, DRIVING otherwise). For each stop, set visitTip to a single sentence covering one of: whether reservations or tickets should be booked in advance, whether long queues are common and when to avoid them, or the best time of day to visit. Set visitTip to null if none of these apply. For each stop, set category to exactly one of: food, sights, outdoors, culture. Use food for restaurants, markets, cafes, and bars. Use sights for landmarks, museums, galleries, and historic sites. Use outdoors for parks, beaches, hikes, and natural areas. Use culture for theaters, festivals, temples, and local experiences.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction:
            "You are a travel itinerary planner. Generate realistic itineraries with real, well-known points of interest and accurate coordinates.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              destination: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    stops: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          address: { type: Type.STRING },
                          lat: { type: Type.NUMBER },
                          lng: { type: Type.NUMBER },
                          time: { type: Type.STRING },
                          durationMin: { type: Type.NUMBER },
                          blurb: { type: Type.STRING },
                          category: { 
                            type: Type.STRING,
                            enum: ["food", "sights", "outdoors", "culture"],
                            description: "Category of the stop. Must be exactly one of the listed values."},
                          travelModeToNext: {
                            type: Type.STRING,
                            enum: ["WALKING", "DRIVING", "TRANSIT"],
                          },
                          visitTip: {
                            type: Type.STRING,
                            nullable: true,
                            description: "One sentence tip about reservations, queues, or best time to visit. Omit if not applicable.",
                          },
                        },
                        required: ["name", "lat", "lng", "time", "durationMin", "blurb"],
                      },
                    },
                  },
                  required: ["title", "summary", "stops"],
                },
              },
            },
            required: ["title", "destination", "days"],
          },
        },
      });

      const text = res.text;
      if (!text) throw new Error("No itinerary generated");
      const raw = JSON.parse(text);
      const parsed = ItinerarySchema.parse(raw);
      return parsed;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/429|rate/i.test(msg))
        throw new Error("Rate limit exceeded. Please try again shortly.");
      if (/quota|billing|402/i.test(msg))
        throw new Error("Gemini API quota exceeded. Check your Google AI Studio billing.");
      throw new Error(`Gemini error: ${msg}`);
    }
  });

export const generateBlurb = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; destination?: string; token: string }) => GenerateBlurbInput.parse(d))
  .handler(async ({ data }) => {
    // 1. Verify the session is valid and get the user.
    const user = await requireAuth(data.token);

    // 2. Enforce per-user cooldown for blurb generation.
    await checkAndRecordAiRateLimit(user.id, "generateBlurb");

    const ai = getClient();
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: `${data.name}${data.destination ? ` in ${data.destination}` : ""}` },
          ],
        },
      ],
      config: {
        systemInstruction:
          "Write a single concise sentence (max 22 words) describing a travel point of interest. No emojis, no quotes.",
      },
    });
    return { blurb: (res.text ?? "").trim() };
  });