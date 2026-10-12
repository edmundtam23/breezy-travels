// Shared trip-focus options used by the New Trip dialog and the
// Edit Trip Details dialog. Kept here so both stay in sync.
export const FOCUS_OPTIONS = [
  {
    value: "food",
    label: "🍜 Food",
    prompt:
      "Prioritize highly-rated local restaurants, food markets, street food, cafes, and unique dining experiences. Avoid generic tourist traps.",
  },
  {
    value: "sights",
    label: "🏛 Sights",
    prompt:
      "Focus on iconic landmarks, museums, historical sites, and must-see attractions. Include context about each location's significance.",
  },
  {
    value: "outdoors",
    label: "🌿 Outdoors",
    prompt:
      "Prioritize parks, hiking trails, beaches, nature reserves, and outdoor activities. Include practical tips like best times to visit.",
  },
  {
    value: "culture",
    label: "🎨 Culture",
    prompt:
      "Focus on art galleries, theatres, local neighbourhoods, street art, live music venues, and authentic cultural experiences.",
  },
  {
    value: "mix",
    label: "✨ Mix",
    prompt:
      "Create a balanced mix of food, sightseeing, culture, and outdoor experiences for a well-rounded itinerary.",
  },
] as const;

export type FocusValue = (typeof FOCUS_OPTIONS)[number]["value"];
