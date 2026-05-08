import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMapsApiKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env.GOOGLE_MAPS_API_KEY ?? "" };
});

const StopSchema = z.object({
  name: z.string(),
  address: z.string().optional().default(""),
  lat: z.number(),
  lng: z.number(),
  time: z.string(),
  durationMin: z.number().default(60),
  blurb: z.string(),
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

export const generateItinerary = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string; days: number }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a travel itinerary planner. Generate realistic itineraries with real, well-known points of interest. Provide accurate latitude/longitude coordinates. Each day should have 4-6 stops. Times should be in HH:MM (24h). Blurbs should be 1-2 sentences. Choose appropriate travel modes (WALKING for stops within 1km, TRANSIT for urban, DRIVING otherwise).",
          },
          {
            role: "user",
            content: `Plan a ${data.days}-day trip: ${data.prompt}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_itinerary",
              description: "Return a structured travel itinerary",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  destination: { type: "string" },
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        summary: { type: "string" },
                        stops: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              address: { type: "string" },
                              lat: { type: "number" },
                              lng: { type: "number" },
                              time: { type: "string" },
                              durationMin: { type: "number" },
                              blurb: { type: "string" },
                              category: { type: "string" },
                              travelModeToNext: {
                                type: "string",
                                enum: ["WALKING", "DRIVING", "TRANSIT"],
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
          },
        ],
        tool_choice: { type: "function", function: { name: "build_itinerary" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (res.status === 402)
        throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error ${res.status}: ${t}`);
    }
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No itinerary generated");
    const parsed = ItinerarySchema.parse(typeof args === "string" ? JSON.parse(args) : args);
    return parsed;
  });

export const generateBlurb = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; destination?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Write a single concise sentence (max 22 words) describing a travel point of interest. No emojis, no quotes.",
          },
          {
            role: "user",
            content: `${data.name}${data.destination ? ` in ${data.destination}` : ""}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = await res.json();
    return { blurb: (json.choices?.[0]?.message?.content ?? "").trim() };
  });
