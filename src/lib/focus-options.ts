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

// Pace options: how many stops per day the AI should plan.
export const PACE_OPTIONS = [
  {
    value: "relaxed",
    label: "🐢 Relaxed",
    prompt:
      "Plan a relaxed pace: 2-3 stops per day with plenty of downtime. Avoid packing the schedule; leave room for spontaneous exploration and rest.",
  },
  {
    value: "balanced",
    label: "⚖️ Balanced",
    prompt:
      "Plan a balanced pace: 4-5 stops per day. A full but comfortable schedule with a mix of activities and short breaks.",
  },
  {
    value: "packed",
    label: "🚀 Packed",
    prompt:
      "Plan a packed pace: 6+ stops per day. Maximize the itinerary with a full schedule from morning to evening for travelers who want to see it all.",
  },
] as const;

export type PaceValue = (typeof PACE_OPTIONS)[number]["value"];

// Budget options: steer food and activity picks toward a price tier.
export const BUDGET_OPTIONS = [
  {
    value: "budget",
    label: "💰 Budget",
    prompt:
      "Prioritize budget-friendly options: free attractions, affordable local eats, street food, and low-cost activities. Avoid expensive restaurants and premium experiences.",
  },
  {
    value: "moderate",
    label: "💳 Moderate",
    prompt:
      "Aim for a moderate budget: a mix of affordable and mid-range restaurants, attractions, and activities. Good value without extravagance.",
  },
  {
    value: "splurge",
    label: "💎 Splurge",
    prompt:
      "Don't hold back on cost: prioritize highly-rated fine dining, premium experiences, and top-tier attractions. Assume the traveler wants the best.",
  },
] as const;

export type BudgetValue = (typeof BUDGET_OPTIONS)[number]["value"];
