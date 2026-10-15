import type { Trip } from "./types";

// ── Sample itineraries for the Inspiration tab ─────────────────────────────
// Curated, static content. No user data, no privacy concerns. These are
// hand-picked trips that showcase the product and give new users ideas.

export type Region = "asia" | "europe" | "americas" | "africa" | "oceania";

export interface SampleTrip extends Omit<Trip, "createdAt" | "updatedAt"> {
  region: Region;
  tagline: string; // short marketing blurb for the card
  tags: string[]; // e.g. ["food", "culture"]
}

const COUNTRY_TO_REGION: Record<string, Region> = {
  // Asia
  JP: "asia", KR: "asia", CN: "asia", TH: "asia", VN: "asia", ID: "asia",
  IN: "asia", MY: "asia", SG: "asia", PH: "asia", TW: "asia", HK: "asia",
  KH: "asia", LA: "asia", MM: "asia", NP: "asia", LK: "asia", MV: "asia",
  // Europe
  FR: "europe", IT: "europe", ES: "europe", GB: "europe", DE: "europe",
  NL: "europe", GR: "europe", PT: "europe", IS: "europe", CH: "europe",
  AT: "europe", BE: "europe", CZ: "europe", HR: "europe", DK: "europe",
  SE: "europe", NO: "europe", FI: "europe", IE: "europe", PL: "europe",
  HU: "europe", TR: "europe",
  // Americas
  US: "americas", CA: "americas", MX: "americas", BR: "americas",
  AR: "americas", CL: "americas", PE: "americas", CO: "americas",
  CR: "americas", CU: "americas", JM: "americas", EC: "americas",
  // Africa
  MA: "africa", EG: "africa", ZA: "africa", KE: "africa", TZ: "africa",
  // Oceania
  AU: "oceania", NZ: "oceania", FJ: "oceania",
};

export function countryToRegion(code?: string): Region | undefined {
  if (!code) return undefined;
  return COUNTRY_TO_REGION[code.toUpperCase()];
}

// ── Sample trips ──────────────────────────────────────────────────────────

export const SAMPLE_TRIPS: SampleTrip[] = [
  {
    id: "sample-tokyo",
    title: "Tokyo in 4 Days",
    destination: "Tokyo, Japan",
    countryCode: "JP",
    region: "asia",
    tagline: "Neon streets, quiet temples, and the best food city on earth.",
    tags: ["food", "culture", "city"],
    pace: "balanced",
    budget: "moderate",
    focus: "mix",
    days: [
      {
        id: "tokyo-d1",
        title: "Day 1 — Old Tokyo",
        summary: "Temples, traditional streets, and sumo-town eats.",
        stops: [
          {
            id: "tokyo-d1-s1", name: "Senso-ji Temple", address: "2-3-1 Asakusa, Taito City",
            lat: 35.7148, lng: 139.7967, time: "09:00", durationMin: 90,
            blurb: "Tokyo's oldest temple. Arrive early to beat the crowds at the Kaminarimon gate.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "tokyo-d1-s2", name: "Nakamise Shopping Street", address: "Asakusa, Taito City",
            lat: 35.7118, lng: 139.7965, time: "10:30", durationMin: 60,
            blurb: "Snack your way down this 250m lane — ningyo-yaki and age-manju are musts.",
            category: "food", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d1-s3", name: "Ueno Park & Museums", address: "Uenokoen, Taito City",
            lat: 35.7156, lng: 139.7711, time: "13:00", durationMin: 150,
            blurb: "Pick one museum (Tokyo National Museum for classics) then stroll the park.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "tokyo-d1-s4", name: "Ameya-Yokocho Market", address: "Ueno, Taito City",
            lat: 35.7090, lng: 139.7740, time: "16:00", durationMin: 90,
            blurb: "Lively post-war market street. Great for street food and people-watching.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "tokyo-d2",
        title: "Day 2 — West Side Icons",
        summary: "Shibuya, Harajuku, and Shinjuku after dark.",
        stops: [
          {
            id: "tokyo-d2-s1", name: "Meiji Jingu Shrine", address: "1-1 Yoyogikamizonocho, Shibuya",
            lat: 35.6764, lng: 139.6993, time: "09:00", durationMin: 90,
            blurb: "A forested oasis in the city. The sake barrel wall is worth the detour.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "tokyo-d2-s2", name: "Takeshita Street", address: "Jingumae, Shibuya",
            lat: 35.6712, lng: 139.7031, time: "11:00", durationMin: 60,
            blurb: "Harajuku's chaotic fashion strip. Crepes are non-negotiable.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "tokyo-d2-s3", name: "Shibuya Crossing & Hachiko", address: "Shibuya, Tokyo",
            lat: 35.6595, lng: 139.7005, time: "14:00", durationMin: 60,
            blurb: "Watch the scramble from the Starbucks overlook, then dive in.",
            category: "sights", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d2-s4", name: "Omoide Yokocho", address: "Nishishinjuku, Shinjuku",
            lat: 35.6938, lng: 139.6993, time: "18:00", durationMin: 120,
            blurb: "'Memory Lane' — smoky yakitori alleys that feel frozen in the 1950s.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "tokyo-d3",
        title: "Day 3 — Art & Waterfront",
        summary: "TeamLab, Odaiba views, and conveyor-belt sushi.",
        stops: [
          {
            id: "tokyo-d3-s1", name: "teamLab Planets", address: "6-1-16 Toyosu, Koto City",
            lat: 35.6493, lng: 139.7898, time: "10:00", durationMin: 150,
            blurb: "Immersive digital art. Book tickets weeks ahead — it sells out.",
            category: "culture", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d3-s2", name: "Odaiba Seaside Park", address: "Daiba, Minato City",
            lat: 35.6298, lng: 139.7745, time: "13:00", durationMin: 90,
            blurb: "Beach with a Statue of Liberty replica and Rainbow Bridge views.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "tokyo-d3-s3", name: "Toyosu Senkyaku Banrai", address: "6-4-1 Toyosu, Koto City",
            lat: 35.6480, lng: 139.7830, time: "15:30", durationMin: 90,
            blurb: "Edo-period-style food hall next to the fish market. Sushi heaven.",
            category: "food", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d3-s4", name: "Tokyo Tower", address: "4-2-8 Shibakoen, Minato City",
            lat: 35.6586, lng: 139.7454, time: "19:00", durationMin: 90,
            blurb: "The orange icon looks best lit up at night. Main deck is enough.",
            category: "sights", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "tokyo-d4",
        title: "Day 4 — Day Trip to Nikko",
        summary: "Waterfalls, shrines, and mountain air.",
        stops: [
          {
            id: "tokyo-d4-s1", name: "Toshogu Shrine", address: "2301 Sannai, Nikko",
            lat: 36.7580, lng: 139.5990, time: "10:00", durationMin: 120,
            blurb: "Ornate UNESCO shrine complex. The 'see no evil' monkeys live here.",
            category: "culture", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d4-s2", name: "Kegon Falls", address: "Chugushi, Nikko",
            lat: 36.7380, lng: 139.5010, time: "13:00", durationMin: 60,
            blurb: "97m waterfall. The elevator down to the viewing platform is worth it.",
            category: "outdoors", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d4-s3", name: "Lake Chuzenji", address: "Nikko, Tochigi",
            lat: 36.7400, lng: 139.4700, time: "14:30", durationMin: 90,
            blurb: "Serene mountain lake. Walk the shore or just sit with a coffee.",
            category: "outdoors", travelModeToNext: "TRANSIT",
          },
          {
            id: "tokyo-d4-s4", name: "Shinkyo Bridge", address: "Nikko, Tochigi",
            lat: 36.7530, lng: 139.6030, time: "16:30", durationMin: 30,
            blurb: "The vermillion 'sacred bridge' — perfect final photo before heading back.",
            category: "sights", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
  {
    id: "sample-paris",
    title: "Paris in 3 Days",
    destination: "Paris, France",
    countryCode: "FR",
    region: "europe",
    tagline: "The greatest hits, done right — with time for long lunches.",
    tags: ["culture", "food", "romance"],
    pace: "balanced",
    budget: "moderate",
    focus: "culture",
    days: [
      {
        id: "paris-d1",
        title: "Day 1 — The Icons",
        summary: "Eiffel Tower, Champs-Élysées, and the Louvre.",
        stops: [
          {
            id: "paris-d1-s1", name: "Eiffel Tower", address: "Champ de Mars, 75007",
            lat: 48.8584, lng: 2.2945, time: "09:00", durationMin: 120,
            blurb: "Book summit tickets in advance. Morning light is best for photos.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d1-s2", name: "Champs-Élysées & Arc de Triomphe", address: "Place Charles de Gaulle, 75008",
            lat: 48.8738, lng: 2.2950, time: "12:00", durationMin: 90,
            blurb: "Walk the avenue, climb the Arc for the best view in Paris.",
            category: "sights", travelModeToNext: "TRANSIT",
          },
          {
            id: "paris-d1-s3", name: "Louvre Museum", address: "Rue de Rivoli, 75001",
            lat: 48.8606, lng: 2.3376, time: "14:30", durationMin: 180,
            blurb: "Don't try to see it all. Mona Lisa + Denon wing + leave happy.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d1-s4", name: "Tuileries Garden", address: "Place de la Concorde, 75001",
            lat: 48.8636, lng: 2.3275, time: "18:00", durationMin: 60,
            blurb: "Golden-hour stroll. Grab a chair by the fountain and decompress.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "paris-d2",
        title: "Day 2 — Left Bank",
        summary: "Latin Quarter, Panthéon, and Saint-Germain cafés.",
        stops: [
          {
            id: "paris-d2-s1", name: "Panthéon", address: "Place du Panthéon, 75005",
            lat: 48.8462, lng: 2.3458, time: "10:00", durationMin: 90,
            blurb: "France's hall of greats. The dome climb has killer views.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d2-s2", name: "Luxembourg Gardens", address: "Rue de Vaugirard, 75006",
            lat: 48.8462, lng: 2.3372, time: "12:00", durationMin: 90,
            blurb: "The prettiest park in Paris. Sailboat pond, pony rides, the works.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d2-s3", name: "Café de Flore", address: "172 Bd Saint-Germain, 75006",
            lat: 48.8542, lng: 2.3325, time: "14:30", durationMin: 60,
            blurb: "Yes it's touristy. Yes the hot chocolate is worth it.",
            category: "food", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d2-s4", name: "Musée d'Orsay", address: "1 Rue de la Légion d'Honneur, 75007",
            lat: 48.8600, lng: 2.3266, time: "16:00", durationMin: 120,
            blurb: "Impressionists in a Beaux-Arts train station. Better than the Louvre, some say.",
            category: "culture", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "paris-d3",
        title: "Day 3 — Montmartre & Le Marais",
        summary: "Sacré-Cœur, artists' square, and falafel.",
        stops: [
          {
            id: "paris-d3-s1", name: "Sacré-Cœur Basilica", address: "35 Rue du Chevalier-de-la-Barre, 75018",
            lat: 48.8867, lng: 2.3431, time: "09:30", durationMin: 90,
            blurb: "Go early for the steps to yourself. The mosaic inside is stunning.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d3-s2", name: "Place du Tertre", address: "Place du Tertre, 75018",
            lat: 48.8865, lng: 2.3409, time: "11:00", durationMin: 60,
            blurb: "Artists' square. Get a sketch done or just watch the painters.",
            category: "culture", travelModeToNext: "TRANSIT",
          },
          {
            id: "paris-d3-s3", name: "Le Marais", address: "Le Marais, 75004",
            lat: 48.8637, lng: 2.3615, time: "13:30", durationMin: 120,
            blurb: "Falafel on Rue des Rosiers, then vintage shopping. L'As du Fallafel for the classic.",
            category: "food", travelModeToNext: "WALKING",
          },
          {
            id: "paris-d3-s4", name: "Seine Evening Cruise", address: "Port de la Conférence, 75008",
            lat: 48.8647, lng: 2.3118, time: "20:00", durationMin: 90,
            blurb: "End the trip right — the monuments lit up from the water.",
            category: "sights", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
  {
    id: "sample-nyc",
    title: "NYC Weekend",
    destination: "New York City, USA",
    countryCode: "US",
    region: "americas",
    tagline: "48 hours, maximum city. Wear comfortable shoes.",
    tags: ["city", "food", "culture"],
    pace: "packed",
    budget: "moderate",
    focus: "sights",
    days: [
      {
        id: "nyc-d1",
        title: "Day 1 — Midtown & Central Park",
        summary: "The classics, from Times Square to the Met.",
        stops: [
          {
            id: "nyc-d1-s1", name: "Times Square", address: "Manhattan, NY 10036",
            lat: 40.7580, lng: -73.9855, time: "09:00", durationMin: 45,
            blurb: "See it once, early, then move on. The energy is the attraction.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "nyc-d1-s2", name: "Central Park", address: "Manhattan, NY",
            lat: 40.7812, lng: -73.9665, time: "10:30", durationMin: 120,
            blurb: "Bethesda Terrace to the Ramble. Rent a rowboat if it's nice out.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "nyc-d1-s3", name: "The Metropolitan Museum of Art", address: "1000 5th Ave, NY 10028",
            lat: 40.7794, lng: -73.9632, time: "13:30", durationMin: 150,
            blurb: "The rooftop (seasonal) has the best skyline view in the museum world.",
            category: "culture", travelModeToNext: "TRANSIT",
          },
          {
            id: "nyc-d1-s4", name: "Katz's Delicatessen", address: "205 E Houston St, NY 10002",
            lat: 40.7223, lng: -73.9874, time: "18:30", durationMin: 60,
            blurb: "The pastrami lives up to the hype. Don't lose your ticket.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "nyc-d2",
        title: "Day 2 — Downtown",
        summary: "9/11 Memorial, Wall Street, and Brooklyn views.",
        stops: [
          {
            id: "nyc-d2-s1", name: "9/11 Memorial", address: "180 Greenwich St, NY 10007",
            lat: 40.7115, lng: -74.0134, time: "09:30", durationMin: 90,
            blurb: "Solemn and beautifully done. The museum needs 2+ hours if you go in.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "nyc-d2-s2", name: "Wall Street & Charging Bull", address: "Wall St, NY 10005",
            lat: 40.7075, lng: -74.0113, time: "11:30", durationMin: 45,
            blurb: "Quick photo stop. The bull's line moves fast.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "nyc-d2-s3", name: "Brooklyn Bridge Walk", address: "Brooklyn Bridge, NY",
            lat: 40.7061, lng: -73.9969, time: "13:00", durationMin: 90,
            blurb: "Walk Manhattan → Brooklyn. DUMBO for pizza and the classic photo.",
            category: "outdoors", travelModeToNext: "TRANSIT",
          },
          {
            id: "nyc-d2-s4", name: "West Village Dinner", address: "West Village, Manhattan",
            lat: 40.7358, lng: -74.0036, time: "19:00", durationMin: 120,
            blurb: "Wander the brownstone streets, pick any packed restaurant. You can't go wrong.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
  {
    id: "sample-bali",
    title: "Bali Slow Week",
    destination: "Bali, Indonesia",
    countryCode: "ID",
    region: "asia",
    tagline: "Temples, rice terraces, and beach clubs. No rushing.",
    tags: ["relaxed", "outdoors", "culture"],
    pace: "relaxed",
    budget: "budget",
    focus: "outdoors",
    days: [
      {
        id: "bali-d1",
        title: "Day 1 — Uluwatu",
        summary: "Cliff temples and sunset kecak dance.",
        stops: [
          {
            id: "bali-d1-s1", name: "Padang Padang Beach", address: "Uluwatu, Bali",
            lat: -8.8117, lng: 115.1036, time: "10:00", durationMin: 150,
            blurb: "Hidden cove through the rocks. Go at low tide.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "bali-d1-s2", name: "Uluwatu Temple", address: "Pecatu, South Kuta",
            lat: -8.8149, lng: 115.0927, time: "15:00", durationMin: 120,
            blurb: "Cliffside temple. Watch your sunglasses — the monkeys steal them.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "bali-d1-s3", name: "Kecak Fire Dance", address: "Uluwatu Temple",
            lat: -8.8149, lng: 115.0927, time: "18:00", durationMin: 60,
            blurb: "Chanting, fire, sunset. Book the 6pm show.",
            category: "culture", travelModeToNext: "DRIVING",
          },
          {
            id: "bali-d1-s4", name: "Jimbaran Bay Seafood", address: "Jimbaran, Bali",
            lat: -8.7892, lng: 115.1677, time: "20:00", durationMin: 90,
            blurb: "Grilled fish on the sand, toes in the water. Perfect end to day one.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "bali-d2",
        title: "Day 2 — Ubud",
        summary: "Rice terraces, monkey forest, and spa time.",
        stops: [
          {
            id: "bali-d2-s1", name: "Tegalalang Rice Terrace", address: "Tegallalang, Gianyar",
            lat: -8.4314, lng: 115.2777, time: "08:00", durationMin: 120,
            blurb: "Go early for mist and empty swings. The views are unreal.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "bali-d2-s2", name: "Sacred Monkey Forest", address: "Jl. Monkey Forest, Ubud",
            lat: -8.5194, lng: 115.2583, time: "11:00", durationMin: 90,
            blurb: "Ancient jungle temple overrun by macaques. Keep food hidden.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "bali-d2-s3", name: "Ubud Market & Palace", address: "Jl. Raya Ubud No.8",
            lat: -8.5069, lng: 115.2625, time: "14:00", durationMin: 90,
            blurb: "Bargain for rattan bags, then peek at the palace across the street.",
            category: "culture", travelModeToNext: "WALKING",
          },
          {
            id: "bali-d2-s4", name: "Traditional Balinese Spa", address: "Ubud, Bali",
            lat: -8.5100, lng: 115.2600, time: "16:30", durationMin: 120,
            blurb: "$15 for a 90-minute massage. You'll wonder why you ever paid more.",
            category: "sights", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "bali-d3",
        title: "Day 3 — Nusa Penida",
        summary: "Day trip to the famous cliffs and crystal water.",
        stops: [
          {
            id: "bali-d3-s1", name: "Kelingking Beach", address: "Nusa Penida, Bali",
            lat: -8.7390, lng: 115.4650, time: "09:00", durationMin: 120,
            blurb: "The T-Rex cliff. Viewpoint is enough — the hike down is brutal.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "bali-d3-s2", name: "Angel's Billabong", address: "Nusa Penida, Bali",
            lat: -8.7260, lng: 115.4700, time: "12:00", durationMin: 60,
            blurb: "Natural infinity pool. Only swim at low tide.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "bali-d3-s3", name: "Crystal Bay", address: "Nusa Penida, Bali",
            lat: -8.7160, lng: 115.4530, time: "14:00", durationMin: 120,
            blurb: "Best snorkeling on the island. Turtles if you're lucky.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "bali-d3-s4", name: "Sanur Harbor Return", address: "Sanur, Denpasar",
            lat: -8.6750, lng: 115.2660, time: "17:00", durationMin: 60,
            blurb: "Last fast boat back. Watch the sunset from the deck.",
            category: "sights", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
  {
    id: "sample-iceland",
    title: "Iceland Ring Road",
    destination: "Iceland",
    countryCode: "IS",
    region: "europe",
    tagline: "Waterfalls, black beaches, and glaciers. The ultimate road trip.",
    tags: ["outdoors", "road-trip", "adventure"],
    pace: "packed",
    budget: "moderate",
    focus: "outdoors",
    days: [
      {
        id: "iceland-d1",
        title: "Day 1 — Golden Circle",
        summary: "The classic loop: geysers, falls, and tectonic plates.",
        stops: [
          {
            id: "iceland-d1-s1", name: "Thingvellir National Park", address: "Thingvellir",
            lat: 64.2557, lng: -21.1295, time: "09:00", durationMin: 120,
            blurb: "Walk between two continents. The Oxararfoss waterfall is a bonus.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d1-s2", name: "Geysir Geothermal Area", address: "Haukadalur",
            lat: 64.3101, lng: -20.3026, time: "12:00", durationMin: 60,
            blurb: "Strokkur erupts every 5-8 minutes. Stand upwind.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d1-s3", name: "Gullfoss Waterfall", address: "Blaskogabyggd",
            lat: 64.3271, lng: -20.1199, time: "14:00", durationMin: 90,
            blurb: "Two-tiered monster. The upper path gets you soaked (in a good way).",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d1-s4", name: "Kerid Crater", address: "Grimsnes",
            lat: 64.0415, lng: -20.8851, time: "16:30", durationMin: 45,
            blurb: "Volcanic crater lake with red slopes. Quick stop, great photos.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
        ],
      },
      {
        id: "iceland-d2",
        title: "Day 2 — South Coast",
        summary: "Black beaches, waterfalls you can walk behind, glacier views.",
        stops: [
          {
            id: "iceland-d2-s1", name: "Seljalandsfoss", address: "Seljalandsvegur",
            lat: 63.6156, lng: -19.9886, time: "09:00", durationMin: 90,
            blurb: "Walk behind the curtain of water. Bring a rain jacket.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d2-s2", name: "Skogafoss", address: "Skogar",
            lat: 63.5321, lng: -19.5115, time: "11:30", durationMin: 90,
            blurb: "Climb the 527 steps for the view from the top. Rainbows guaranteed.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d2-s3", name: "Reynisfjara Black Beach", address: "Vik",
            lat: 63.4047, lng: -19.0473, time: "14:30", durationMin: 90,
            blurb: "Basalt columns and sea stacks. Respect the waves — they're deadly.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d2-s4", name: "Vik Village", address: "Vik i Myrdal",
            lat: 63.4186, lng: -19.0060, time: "17:00", durationMin: 60,
            blurb: "Tiny town, big church on the hill. Soup at the Soup Company.",
            category: "food", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "iceland-d3",
        title: "Day 3 — Glaciers & Lagoons",
        summary: "Icebergs, diamond beaches, and Europe's largest glacier.",
        stops: [
          {
            id: "iceland-d3-s1", name: "Jokulsarlon Glacier Lagoon", address: "Hornafjordur",
            lat: 64.0784, lng: -16.2306, time: "10:00", durationMin: 120,
            blurb: "Blue icebergs drifting to the sea. The zodiac boat tour is worth it.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
          {
            id: "iceland-d3-s2", name: "Diamond Beach", address: "Across from Jokulsarlon",
            lat: 64.0750, lng: -16.2200, time: "12:30", durationMin: 60,
            blurb: "Ice chunks scattered on black sand like diamonds. Otherworldly.",
            category: "outdoors", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d3-s3", name: "Hofn", address: "Hofn i Hornafjordur",
            lat: 64.2537, lng: -15.2082, time: "15:00", durationMin: 90,
            blurb: "Langoustine capital. Pakkhus is the spot for the famous tails.",
            category: "food", travelModeToNext: "DRIVING",
          },
          {
            id: "iceland-d3-s4", name: "Vestrahorn", address: "Stokksnes",
            lat: 64.2770, lng: -14.9530, time: "18:00", durationMin: 60,
            blurb: "Jagged peaks over black dunes. The most photographed mountain in Iceland.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
  {
    id: "sample-la",
    title: "LA Weekend",
    destination: "Los Angeles, USA",
    countryCode: "US",
    region: "americas",
    tagline: "Beaches, tacos, and Hollywood — without the cross-city backtracking.",
    tags: ["food", "beaches", "city"],
    pace: "balanced",
    budget: "moderate",
    focus: "food",
    days: [
      {
        id: "la-d1",
        title: "Day 1 — Westside",
        summary: "Santa Monica, Venice, and sunset on the sand.",
        stops: [
          {
            id: "la-d1-s1", name: "Santa Monica Pier", address: "200 Santa Monica Pier",
            lat: 34.0100, lng: -118.4960, time: "10:00", durationMin: 90,
            blurb: "The end of Route 66. Ride the Ferris wheel, then walk south.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "la-d1-s2", name: "Venice Beach Boardwalk", address: "Venice Beach",
            lat: 33.9850, lng: -118.4690, time: "12:00", durationMin: 120,
            blurb: "Muscle Beach, skate park, street performers. Peak LA weirdness.",
            category: "sights", travelModeToNext: "WALKING",
          },
          {
            id: "la-d1-s3", name: "Abbot Kinney Blvd", address: "Venice, CA 90291",
            lat: 33.9900, lng: -118.4670, time: "15:00", durationMin: 90,
            blurb: "The coolest street in LA. Boutiques, galleries, great coffee.",
            category: "sights", travelModeToNext: "DRIVING",
          },
          {
            id: "la-d1-s4", name: "Manhattan Beach Sunset", address: "Manhattan Beach, CA",
            lat: 33.8840, lng: -118.4100, time: "18:00", durationMin: 90,
            blurb: "Quieter than Santa Monica. Pier + sunset = perfect evening.",
            category: "outdoors", travelModeToNext: "WALKING",
          },
        ],
      },
      {
        id: "la-d2",
        title: "Day 2 — Hollywood & Griffith",
        summary: "Stars, views, and the city's best tacos.",
        stops: [
          {
            id: "la-d2-s1", name: "Griffith Observatory", address: "2800 E Observatory Rd",
            lat: 34.1184, lng: -118.3004, time: "09:30", durationMin: 120,
            blurb: "Best Hollywood Sign views + free planetarium vibes. Go early for parking.",
            category: "sights", travelModeToNext: "DRIVING",
          },
          {
            id: "la-d2-s2", name: "Hollywood Walk of Fame", address: "Hollywood Blvd",
            lat: 34.1010, lng: -118.3260, time: "12:00", durationMin: 60,
            blurb: "It's touristy and that's fine. Find your favorite star, keep walking.",
            category: "sights", travelModeToNext: "DRIVING",
          },
          {
            id: "la-d2-s3", name: "Grand Central Market", address: "317 S Broadway, DTLA",
            lat: 34.0507, lng: -118.2489, time: "14:00", durationMin: 90,
            blurb: "Tacos at Tacos Tumbras, egg sandwiches at Eggslut. Eat everything.",
            category: "food", travelModeToNext: "WALKING",
          },
          {
            id: "la-d2-s4", name: "The Broad Museum", address: "221 S Grand Ave, DTLA",
            lat: 34.0544, lng: -118.2501, time: "16:00", durationMin: 90,
            blurb: "Free contemporary art (reserve ahead). The Infinity Room books out fast.",
            category: "culture", travelModeToNext: "WALKING",
          },
        ],
      },
    ],
  },
];

// ── Recommendation logic ──────────────────────────────────────────────────

export type InspirationMode =
  | { mode: "all" }
  | { mode: "try-different"; userRegion: Region; suggestion: SampleTrip }
  | { mode: "popular" };

const REGION_LABELS: Record<Region, string> = {
  asia: "Asia",
  europe: "Europe",
  americas: "the Americas",
  africa: "Africa",
  oceania: "Oceania",
};

export function regionLabel(r: Region): string {
  return REGION_LABELS[r];
}

export function getInspirationMode(trips: Trip[]): InspirationMode {
  if (trips.length === 0) return { mode: "all" };

  const regions = new Set<Region>();
  for (const t of trips) {
    const r = countryToRegion(t.countryCode);
    if (r) regions.add(r);
  }
  // No region data → treat like a new user.
  if (regions.size === 0) return { mode: "all" };

  if (regions.size === 1) {
    const userRegion = [...regions][0];
    // Suggest the first sample from a different region (deterministic).
    const suggestion =
      SAMPLE_TRIPS.find((s) => s.region !== userRegion) ?? SAMPLE_TRIPS[0];
    return { mode: "try-different", userRegion, suggestion };
  }

  return { mode: "popular" };
}

/** Convert a sample into a real Trip the user can own and edit. */
export function sampleToTrip(sample: SampleTrip): Trip {
  const now = new Date().toISOString();
  const uid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return {
    id: uid(),
    title: sample.title,
    destination: sample.destination,
    countryCode: sample.countryCode,
    promptText: `Inspired by the sample itinerary: ${sample.title}`,
    focus: sample.focus,
    pace: sample.pace,
    budget: sample.budget,
    // No accommodation — samples never include one (privacy-safe by design).
    days: sample.days.map((d) => ({
      ...d,
      id: uid(),
      stops: d.stops.map((s) => ({ ...s, id: uid() })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
