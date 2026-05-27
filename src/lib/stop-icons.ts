// src/lib/stop-icons.ts
//
// Single source of truth for stop category → emoji mapping.
// Used by demo-trip.tsx and the real trip card component.
//
// Category values must match the enum constraint set in the Gemini response
// schema in itinerary.functions.ts. Any value not in this map falls back to
// the default pin emoji.

const CATEGORY_EMOJI: Record<string, string> = {
  food:     "🍜",
  sights:   "🏛️",
  outdoors: "🌿",
  culture:  "🎨",
};

const DEFAULT_EMOJI = "📍";

/**
 * Returns the emoji for a stop's category string.
 * Accepts the raw category value from the Gemini response (e.g. "food").
 * Falls back to DEFAULT_EMOJI if the value is missing or unrecognised.
 */
export function getCategoryEmoji(category: string | undefined | null): string {
  if (!category) return DEFAULT_EMOJI;
  return CATEGORY_EMOJI[category.toLowerCase().trim()] ?? DEFAULT_EMOJI;
}