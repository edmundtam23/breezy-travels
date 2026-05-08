# Travel Itinerary Builder

A web app to build multi-day travel itineraries with a map + sidebar layout, drag-and-drop reordering, AI-assisted draft generation, and real commute-time warnings via Google Maps.

## User flow

1. **Landing / Home** — Choose "Generate with AI" (prompt like "3 days in San Francisco, foodie focus") or "Start from scratch."
2. **Builder view** — Two-pane layout matching the reference screenshot:
   - Left: Google Map with numbered POI markers and day toggle (Day 1 / Day 2 / ...).
   - Right: Sidebar with day title, summary blurb, and a time-ordered list of POIs (time, photo, name, rating, blurb).
3. **Editing**:
   - Drag-and-drop to reorder POIs within a day (and between days).
   - Click a POI to edit time, blurb, or travel mode to next stop (walk / drive / transit).
   - Add a POI via Google Places search; remove with a button.
   - AI "fill in details" button per stop (generates a short blurb).
4. **Commute warnings** — Between consecutive stops, the app fetches Google Directions for the chosen mode and compares travel time to the gap between scheduled times. If the user can't make it (or has <10 min buffer), an inline red/amber warning shows on the next stop ("Drive is 28 min, you only have 15 min").
5. **Persistence** — All trips saved to `localStorage`. Trip list on home page to reopen/duplicate/delete.
6. **Open in Google Maps** — "Open route" button builds a multi-stop Google Maps directions URL for the active day.

## Pages

- `/` — Trip list + "New trip" CTA (AI prompt or blank).
- `/trip/$tripId` — Builder (map + sidebar, day tabs).

## Technical details

**Stack additions**
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop.
- `@vis.gl/react-google-maps` for the map + markers + Places autocomplete.
- Google Maps JS API loaded with the user's API key (Maps JS, Places, Directions enabled).
- Lovable AI Gateway (`google/gemini-2.5-flash`) via a `createServerFn` for itinerary + blurb generation. Uses built-in `LOVABLE_API_KEY` — no setup required.

**Secrets**
- `GOOGLE_MAPS_API_KEY` — added via the secrets tool. Exposed to the client as a publishable key (Maps JS API requires this; user should restrict it by HTTP referrer in Google Cloud Console).

**Data model (localStorage)**
```ts
type Trip = {
  id: string; title: string; destination: string;
  days: Day[]; createdAt: string; updatedAt: string;
}
type Day = { id: string; title: string; summary: string; stops: Stop[] }
type Stop = {
  id: string; placeId?: string; name: string; lat: number; lng: number;
  time: string; // "09:00"
  durationMin: number; // time spent at stop
  blurb: string; rating?: number; reviewCount?: number; photoUrl?: string;
  travelModeToNext: 'WALKING' | 'DRIVING' | 'TRANSIT';
}
```

**Commute logic**
- React Query fetches Directions for each consecutive pair (`A -> B`, mode = `A.travelModeToNext`).
- Compute `gapMin = stopB.time - (stopA.time + stopA.durationMin)`.
- Status: `ok` (gap >= travel + 10 min buffer), `tight` (gap >= travel), `late` (gap < travel). Show colored badge on stop B.

**Routes**
- `src/routes/index.tsx` — trip list.
- `src/routes/trip.$tripId.tsx` — builder.

**Components**
- `MapPanel` — Google Map, numbered AdvancedMarkers, day filter, fit bounds.
- `ItinerarySidebar` — day tabs, title/summary, sortable stop list, open-route button.
- `StopCard` — sortable item with time, photo, name, blurb, commute warning, edit popover.
- `AddStopSearch` — Places autocomplete to add a stop.
- `NewTripDialog` — AI prompt or blank trip creation.

**Server functions** (`src/lib/itinerary.functions.ts`)
- `generateItinerary({ prompt, days })` — calls Lovable AI Gateway, returns structured itinerary JSON.
- `generateBlurb({ placeName, context })` — short description for a stop.

## Out of scope (v1)

- User accounts / cloud sync (local-only as chosen).
- Sharing/export beyond the Google Maps deep link.
- Booking, pricing, or hotel integration.

## What I'll need from you when implementation starts

- A **Google Maps API key** with Maps JavaScript API, Places API, and Directions API enabled (I'll prompt you to paste it securely).