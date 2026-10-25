import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Trip } from "./types";
 
// Keep localStorage as fallback for unauthenticated users
const KEY = "itineraries.v1";
 
function readLocal(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}
 
function writeLocal(trips: Trip[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(trips));
  // No "itineraries:changed" dispatch here: saveTrip/deleteTrip dispatch
  // once after the cache is updated, so listeners never see a stale cache.
}
 
async function getCurrentUserId(): Promise<string | null> {
  // Local session only — no network round trip. RLS enforces ownership
  // server-side, so the client only needs the ID for cache scoping and
  // row ownership fields. Server functions still verify via getUser().
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
 
// ── Supabase CRUD ──────────────────────────────────────────────
 
// Single row → Trip mapper. Two hand-written copies drifted apart before
// (one edit path silently dropped fields on save); every read path uses this.
type TripRow = {
  id: string;
  title: string;
  destination: string;
  country_code: string | null;
  days: Trip["days"];
  created_at: string;
  updated_at: string;
  prompt_text: string | null;
  focus: string | null;
  pace: string | null;
  budget: string | null;
  accommodation: string | null;
  accommodation_lat: number | null;
  accommodation_lng: number | null;
};

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    countryCode: row.country_code ?? undefined,
    days: row.days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    promptText: row.prompt_text ?? undefined,
    focus: row.focus ?? undefined,
    pace: row.pace ?? undefined,
    budget: row.budget ?? undefined,
    accommodation: row.accommodation ?? undefined,
    accommodationLat: row.accommodation_lat ?? undefined,
    accommodationLng: row.accommodation_lng ?? undefined,
  };
}

async function fetchTripsFromSupabase(userId: string | null): Promise<Trip[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching trips:", error);
    return [];
  }
  return (data ?? []).map((row) => rowToTrip(row as TripRow));
}
 
async function saveTripToSupabase(trip: Trip): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    // Fall back to localStorage if not logged in
    saveLocalTrip(trip);
    return;
  }
  const { error } = await supabase.from("trips").upsert({
    id: trip.id,
    user_id: userId,
    title: trip.title,
    destination: trip.destination,
    country_code: trip.countryCode ?? null,
    days: trip.days,
    created_at: trip.createdAt,
    updated_at: new Date().toISOString(),
    prompt_text: trip.promptText ?? null,
    focus: trip.focus ?? null,
    pace: trip.pace ?? null,
    budget: trip.budget ?? null,
    accommodation: trip.accommodation ?? null,
    accommodation_lat: trip.accommodationLat ?? null,
    accommodation_lng: trip.accommodationLng ?? null,
  });
  if (error) console.error("Error saving trip:", error);
}
 
async function deleteTripFromSupabase(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    deleteLocalTrip(id);
    return;
  }
  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.error("Error deleting trip:", error);
}
 
// ── localStorage fallbacks ─────────────────────────────────────
 
function saveLocalTrip(trip: Trip) {
  const trips = readLocal();
  const idx = trips.findIndex((t) => t.id === trip.id);
  const next = { ...trip, updatedAt: new Date().toISOString() };
  if (idx >= 0) trips[idx] = next;
  else trips.push(next);
  writeLocal(trips);
  // Keep the module cache in step so listeners don't need a refetch.
  if (tripsCache !== null) {
    tripsCache = trips;
    tripsCacheTime = Date.now();
  }
}
 
function deleteLocalTrip(id: string) {
  const trips = readLocal().filter((t) => t.id !== id);
  writeLocal(trips);
  if (tripsCache !== null) {
    tripsCache = trips;
    tripsCacheTime = Date.now();
  }
}
 
// ── Public hooks & functions ───────────────────────────────────
 
// Returns null while the initial load is in flight so callers can
// distinguish "loading" from "no trips" and avoid flashing an empty state.
export function useTrips(): Trip[] | null {
  // Initialize with cache synchronously — no loading flash on navigation.
  // The auth listener invalidates cache on login/logout, so a stale-user
  // cache is only possible if auth changed without the listener firing,
  // which we double-check below.
  const [trips, setTrips] = useState<Trip[] | null>(() => getCachedTrips());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = await getCurrentUserId();
      const cached = getCachedTrips();
      // Serve cache if it's for this user and fresh. Otherwise refetch.
      if (cached && tripsCacheUserId === userId && !isCacheStale()) {
        if (!cancelled) setTrips(cached);
        return;
      }
      // Cache miss, stale, or wrong user — fetch fresh.
      // (If we served a wrong-user cache above, this corrects it.)
      const fresh = await refreshTrips();
      if (!cancelled) setTrips(fresh);
    })();

    // Same-tab mutation: saveTrip/deleteTrip already updated the cache in
    // place, so just re-read it — no network round trip.
    const localHandler = () => {
      const cached = getCachedTrips();
      if (cached) {
        if (!cancelled) setTrips(cached);
      } else {
        refreshTrips().then((t) => {
          if (!cancelled) setTrips(t);
        });
      }
    };
    // Another tab changed localStorage — our cache may be stale; refetch.
    const storageHandler = () => {
      refreshTrips().then((t) => {
        if (!cancelled) setTrips(t);
      });
    };
    window.addEventListener("itineraries:changed", localHandler);
    window.addEventListener("storage", storageHandler);

    // Listen for auth changes — reload trips when user logs in/out
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      invalidateTripsCache();
      localHandler();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("itineraries:changed", localHandler);
      window.removeEventListener("storage", storageHandler);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return trips;
}

// ── Trips cache ─────────────────────────────────────────────────────────────
// Module-level cache so navigating between pages doesn't refetch from Supabase
// every time. Cache is invalidated on mutations and auth changes.

let tripsCache: Trip[] | null = null;
let tripsCacheTime = 0;
let tripsCacheUserId: string | null | undefined = undefined; // undefined = not yet determined
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCachedTrips(): Trip[] | null {
  return tripsCache;
}

function isCacheStale(): boolean {
  return Date.now() - tripsCacheTime > CACHE_TTL_MS;
}

let refreshInFlight: Promise<Trip[]> | null = null;

async function refreshTrips(): Promise<Trip[]> {
  // Dedupe concurrent refreshes (every mounted useTrips used to refetch).
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    // Resolve the user once and pass it in — fetchTripsFromSupabase used
    // to resolve it again, doubling the auth call per refresh.
    const userId = await getCurrentUserId();
    const remoteTrips = await fetchTripsFromSupabase(userId);
    const result = remoteTrips.length > 0 ? remoteTrips : readLocal();
    tripsCache = result;
    tripsCacheTime = Date.now();
    tripsCacheUserId = userId;
    return result;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// After a successful save, patch the cached entry in place so listeners
// don't need a full refetch (which used to fire per keystroke).
function updateCachedTrip(trip: Trip) {
  if (tripsCache === null) return;
  const idx = tripsCache.findIndex((t) => t.id === trip.id);
  if (idx >= 0) tripsCache[idx] = trip;
  else tripsCache.push(trip);
  tripsCacheTime = Date.now();
}

function removeCachedTrip(id: string) {
  if (tripsCache === null) return;
  tripsCache = tripsCache.filter((t) => t.id !== id);
  tripsCacheTime = Date.now();
}

// Per-trip save queue: serialize writes so a slow earlier write can't land
// after a newer one (the old per-keystroke path could drop characters).
const saveQueues = new Map<string, Promise<void>>();

function enqueueSave(tripId: string, work: () => Promise<void>): Promise<void> {
  const prev = saveQueues.get(tripId) ?? Promise.resolve();
  // Each queued promise catches, so the chain never breaks on an error.
  const next = prev.then(work).catch((e) => {
    console.error("Error saving trip:", e);
  });
  saveQueues.set(tripId, next);
  return next;
}

export function invalidateTripsCache() {
  tripsCache = null;
  tripsCacheTime = 0;
  tripsCacheUserId = undefined;
}
 
export function useTrip(id: string | undefined) {
  const trips = useTrips();
  return trips?.find((t) => t.id === id);
}
 
export async function saveTrip(trip: Trip) {
  const saved = { ...trip, updatedAt: new Date().toISOString() };
  await enqueueSave(trip.id, async () => {
    await saveTripToSupabase(saved);
    updateCachedTrip(saved);
  });
  window.dispatchEvent(new Event("itineraries:changed"));
}
 
export async function deleteTrip(id: string) {
  await deleteTripFromSupabase(id);
  removeCachedTrip(id);
  window.dispatchEvent(new Event("itineraries:changed"));
}
 
export function useUpdateTrip(id: string | undefined) {
  return useCallback(
    async (updater: (trip: Trip) => Trip) => {
      if (!id) return;
      const userId = await getCurrentUserId();
      let trip: Trip | undefined;
 
      if (userId) {
        const { data } = await supabase
          .from("trips")
          .select("*")
          .eq("id", id)
          .single();
        if (data) {
          trip = rowToTrip(data as TripRow);
        }
      } else {
        trip = readLocal().find((t) => t.id === id);
      }
 
      if (!trip) return;
      await saveTrip(updater(trip));
    },
    [id],
  );
}
 
export function newId() {
  // crypto.randomUUID() generates a cryptographically strong UUID v4,
  // far more collision-resistant than the old Math.random() approach.
  return crypto.randomUUID();
}