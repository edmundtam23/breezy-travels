import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMapsApiKey } from "@/lib/itinerary.functions";
import { supabase } from "@/lib/supabase";
import type { Trip } from "@/lib/types";

// ---------------------------------------------------------------------------
// Google Places photos for AI-generated stops.
//
// ToS-shaped design (verified 2026-10-12):
// - Only `place_id` may be stored long-term. Photo names/bytes may NOT be
//   cached ("You cannot cache a photo name. Also, the name can expire.").
// - So: generation resolves place_id once (cheap Pro SKU); photos are fetched
//   LIVE at view time. The only cache is a tab-lifetime in-memory Map so
//   re-viewing the same trip in one session doesn't re-bill.
// - Each photo view costs ~2 billable events (Details w/ photos mask +
//   getMedia) against the 1,000/month free Photos pool. A concurrency limiter
//   keeps bursts smooth and per-minute quota usage sane.
// - Attribution ("Photo by …") is mandatory — surfaced in the lightbox.
// ---------------------------------------------------------------------------

const PLACES_BASE = "https://places.googleapis.com/v1";

export interface PlacePhoto {
  photoName: string; // e.g. "places/ChIJ.../photos/AW..."
  attribution: string; // author display name, may be ""
}

// Tab-lifetime only. Never persisted anywhere.
const photoCache = new Map<string, PlacePhoto | null>();

function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

const limit = createLimiter(4);

/** Resolve a stop name + coordinates to a Google place_id (Pro SKU, storable). */
export async function searchPlaceId(
  name: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: name,
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 1000 },
        },
        maxResultCount: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.places?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Geocode an accommodation name/address to coordinates via Text Search (Pro SKU).
 * Returns {lat, lng} or null if not found. Used for the map pin showing where
 * the traveler is staying. Coordinates are stable and safe to store.
 */
export async function geocodeAccommodation(
  query: string,
  destinationLat: number,
  destinationLng: number,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim() || !apiKey) return null;
  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: { center: { latitude: destinationLat, longitude: destinationLng }, radius: 50000 },
        },
        maxResultCount: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.places?.[0]?.location;
    if (typeof loc?.latitude !== "number" || typeof loc?.longitude !== "number") return null;
    return { lat: loc.latitude, lng: loc.longitude };
  } catch {
    return null;
  }
}

/** Fetch the first photo for a place_id, live (Photos SKU). Session-cached.
 * Returns null when the place has no photos or the fetch fails (e.g. quota).
 */
export async function fetchPlacePhoto(
  placeId: string,
  apiKey: string
): Promise<PlacePhoto | null> {
  if (!placeId || !apiKey) return null;
  const cached = photoCache.get(placeId);
  if (cached !== undefined) return cached;
  const result = await limit(async (): Promise<PlacePhoto | null> => {
    try {
      const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos",
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const photo = data.photos?.[0];
      if (!photo?.name) return null;
      return {
        photoName: photo.name as string,
        attribution: (photo.authorAttributions?.[0]?.displayName as string) ?? "",
      };
    } catch {
      return null;
    }
  });
  photoCache.set(placeId, result);
  return result;
}

/**
 * Build an <img>-usable photo URL. The key goes in the query string because
 * <img> tags can't send headers. The key is referrer-restricted to our
 * domains, matching how the Maps JS key is already used.
 */
export function placePhotoUrl(
  photoName: string,
  apiKey: string,
  maxWidthPx = 400
): string {
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(
    apiKey
  )}`;
}

/**
 * Populate place_id on every stop missing one. Best-effort: never throws,
 * returns the trip with whatever resolved.
 */
export async function enrichTripWithPlaceIds(
  trip: Trip,
  apiKey: string
): Promise<Trip> {
  const days = await Promise.all(
    trip.days.map(async (day) => ({
      ...day,
      stops: await Promise.all(
        day.stops.map(async (stop) => {
          if (stop.placeId || !stop.lat || !stop.lng) return stop;
          const placeId = await limit(() =>
            searchPlaceId(stop.name, stop.lat, stop.lng, apiKey)
          );
          return placeId ? { ...stop, placeId } : stop;
        })
      ),
    }))
  );
  return { ...trip, days, updatedAt: new Date().toISOString() };
}

/**
 * Get the browser Maps API key (served via authed server function, cached in
 * module state by the MapsProvider pattern). Returns "" when unavailable
 * (e.g. logged out) — callers should treat "" as "no photos".
 */
// Module-level cache: many StopPhoto instances mount at once (one per stop),
// so the key is fetched once per tab and shared — not once per component.
// Without this, 25+ simultaneous server-function calls hit the rate limiter.
// NOTE: only successful (non-empty) keys are cached. Failures leave the cache
// empty so a later mount retries — a permanent failure cache would break
// photo enrichment for trips created later in the session (e.g. after login).
let cachedKey: string | null = null;
let keyPromise: Promise<string> | null = null;

export function useGoogleMapsKey(): string | null {
  const fn = useServerFn(getMapsApiKey);
  const [key, setKey] = useState<string | null>(cachedKey);
  useEffect(() => {
    if (cachedKey) return; // already resolved with a valid key
    let cancelled = false;
    if (!keyPromise) {
      keyPromise = (async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token ?? "";
        const r = await fn({ data: { token } });
        const k = r.key || "";
        if (k) {
          cachedKey = k;
        } else {
          // Fetch failed (e.g. logged out) — clear so a later mount retries.
          keyPromise = null;
        }
        return k;
      })().catch(() => {
        // Network/server error — clear so a later mount retries.
        keyPromise = null;
        return "";
      });
    }
    keyPromise.then((k) => {
      if (!cancelled && k) setKey(k);
    });
    return () => {
      cancelled = true;
    };
  }, [fn]);
  return key;
}
