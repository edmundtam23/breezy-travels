import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient, readEnv } from "./server-env";

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

// Per-user AI usage limits, enforced atomically by the consume_ai_quota
// Postgres function (cooldown + daily cap checked and recorded under a row
// lock, so parallel requests can't slip past). This check FAILS CLOSED:
// if the quota can't be verified, the request is refused rather than
// allowed through — the Gemini free tier is 20 requests/day project-wide,
// so an open failure mode could drain the whole pool.
//
// Cooldowns: 30s between itineraries (expensive multi-second calls), 3s
// between blurbs (cheap, but can be looped from stop editing).
// Daily caps: per user, so one account can't consume the shared pool.
const DAILY_CAPS = { generateItinerary: 5, generateBlurb: 50 } as const;
const COOLDOWN_SECONDS = { generateItinerary: 30, generateBlurb: 3 } as const;

type AiAction = "generateItinerary" | "generateBlurb";

async function checkAndRecordAiRateLimit(userId: string, action: AiAction): Promise<void> {
  const db = getServiceClient();
  const { data, error } = await db.rpc("consume_ai_quota", {
    p_user: userId,
    p_action: action,
    p_cooldown_seconds: COOLDOWN_SECONDS[action],
    p_daily_cap: DAILY_CAPS[action],
  });
  if (error) {
    console.error("consume_ai_quota failed:", error.message);
    throw new Error("Couldn't verify usage limits. Please try again shortly.");
  }
  if (data === -1) {
    throw new Error("You've reached today's generation limit. Try again tomorrow.");
  }
  if (typeof data === "number" && data > 0) {
    throw new Error(
      `Please wait ${data} more second${data === 1 ? "" : "s"} before trying again.`
    );
  }
}

export const getMapsApiKey = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await requireAuth(data.token);
    const key = readEnv("GOOGLE_MAPS_API_KEY") ?? "";
    return { key };
  });

// Output schema for Gemini responses. Bounds are generous for legitimate
// output but reject absurd values (the parsed result is stored as trip
// JSON and later rendered/shared, so unbounded fields are an injection
// and bloat surface).
const StopSchema = z.object({
  name: z.string().max(200),
  address: z.string().max(300).optional().default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  time: z.string().max(10),
  durationMin: z.number().min(0).max(1440).default(60),
  blurb: z.string().max(600),
  visitTip: z.string().max(300).nullable().optional().catch(null),
  category: z.string().max(30).optional().default(""),
  travelModeToNext: z.enum(["WALKING", "DRIVING", "TRANSIT"]).default("DRIVING"),
});

const DaySchema = z.object({
  title: z.string().max(200),
  summary: z.string().max(1000),
  stops: z.array(StopSchema).max(30),
});

const ItinerarySchema = z.object({
  title: z.string().max(200),
  destination: z.string().max(200),
  countryCode: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((s) => s.toUpperCase())
    .optional(),
  days: z.array(DaySchema).max(21),
});

const MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey });
}

const GenerateItineraryInput = z.object({
  prompt: z.string().min(1).max(2000).trim(),
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
                text: `Plan a ${data.days}-day trip: ${data.prompt}\n\nReturn a structured itinerary with real, well-known points of interest and accurate latitude/longitude coordinates. Each day should have 4-6 stops. Times in HH:MM (24h). Blurbs should be 1-2 sentences. Choose appropriate travel modes (WALKING for stops within 1km, TRANSIT for urban, DRIVING otherwise). LOGISTICS: Cluster stops geographically within each day to minimize travel time and avoid backtracking across the city. Order stops in a logical geographic sequence rather than jumping between distant areas. Account for typical traffic patterns in the destination (e.g., in spread-out cities like Los Angeles, avoid scheduling cross-city trips during rush hour). If an accommodation location is provided in the prompt, plan each day to start and end near it where practical, and favor nearby options for the first and last stops. For each stop, set visitTip to a single sentence covering one of: whether reservations or tickets should be booked in advance, whether long queues are common and when to avoid them, or the best time of day to visit. Set visitTip to null if none of these apply. For each stop, set category to exactly one of: food, sights, outdoors, culture. Use food for restaurants, markets, cafes, and bars. Use sights for landmarks, museums, galleries, and historic sites. Use outdoors for parks, beaches, hikes, and natural areas. Use culture for theaters, festivals, temples, and local experiences. Also return a countryCode field with the ISO 3166-1 alpha-2 code (e.g. "BR", "JP", "PT") for the primary country of the destination.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction:
            "You are a travel itinerary planner. Generate realistic itineraries with real, well-known points of interest and accurate coordinates.",
          // Cap output: a 14-day itinerary with thinking fits comfortably;
          // the cap exists to stop runaway generation, not to save tokens.
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              destination: { type: Type.STRING },
              countryCode: {type: Type.STRING, description: "ISO 3166-1 alpha-2 country code for the primary destination, e.g. 'BR', 'JP', 'PT'"},
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
            required: ["title", "destination", "days", "countryCode"],
          },
        },
      });

      const text = res.text;
      if (!text) throw new Error("No itinerary generated");
      const raw = JSON.parse(text);
      const parsed = ItinerarySchema.parse(raw);
      return parsed;
    } catch (e: unknown) {
      // Log the real error server-side; return only generic messages so
      // upstream API details (billing state, internal errors) never leak
      // to the client.
      const msg = e instanceof Error ? e.message : String(e);
      console.error("generateItinerary failed:", msg);
      if (/429|rate/i.test(msg))
        throw new Error("Rate limit exceeded. Please try again shortly.");
      throw new Error("Couldn't generate an itinerary right now. Please try again.");
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
    try {
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
          // The sentence itself is ~40 tokens; the headroom covers the
          // model's thinking tokens so blurbs don't come back empty.
          maxOutputTokens: 256,
        },
      });
      return { blurb: (res.text ?? "").trim() };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("generateBlurb failed:", msg);
      if (/429|rate/i.test(msg))
        throw new Error("Rate limit exceeded. Please try again shortly.");
      throw new Error("Couldn't generate a description right now. Please try again.");
    }
  });