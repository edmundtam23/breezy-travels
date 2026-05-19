import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

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

export const getMapsApiKey = createServerFn({ method: "GET" })
  .handler(async () => {
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

export const generateItinerary = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; days: number }) => d)
  .handler(async ({ data }) => {
    const ai = getClient();

    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Plan a ${data.days}-day trip: ${data.prompt}\n\nReturn a structured itinerary with real, well-known points of interest and accurate latitude/longitude coordinates. Each day should have 4-6 stops. Times in HH:MM (24h). Blurbs should be 1-2 sentences. Choose appropriate travel modes (WALKING for stops within 1km, TRANSIT for urban, DRIVING otherwise). For each stop, set visitTip to a single sentence covering one of: whether reservations or tickets should be booked in advance, whether long queues are common and when to avoid them, or the best time of day to visit. Set visitTip to null if none of these apply.`,
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
                          category: { type: Type.STRING },
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
console.log("GEMINI STOP SAMPLE:", JSON.stringify(raw.days?.[0]?.stops?.[0]));
const parsed = ItinerarySchema.parse(raw);
console.log("PARSED STOP SAMPLE:", JSON.stringify(parsed.days?.[0]?.stops?.[0]));
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
  .inputValidator((d: { name: string; destination?: string }) => d)
  .handler(async ({ data }) => {
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
