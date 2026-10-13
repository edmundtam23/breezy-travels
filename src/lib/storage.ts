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
  window.dispatchEvent(new Event("itineraries:changed"));
}
 
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
 
// ── Supabase CRUD ──────────────────────────────────────────────
 
async function fetchTripsFromSupabase(): Promise<Trip[]> {
  const userId = await getCurrentUserId();
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
return (data ?? []).map((row) => ({
  id: row.id,
  title: row.title,
  destination: row.destination,
  countryCode: row.country_code ?? undefined,
  days: row.days,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  promptText: row.prompt_text ?? undefined,
  focus: row.focus ?? undefined,
}));
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
}
 
function deleteLocalTrip(id: string) {
  writeLocal(readLocal().filter((t) => t.id !== id));
}
 
// ── Public hooks & functions ───────────────────────────────────
 
// Returns null while the initial load is in flight so callers can
// distinguish "loading" from "no trips" and avoid flashing an empty state.
export function useTrips(): Trip[] | null {
  const [trips, setTrips] = useState<Trip[] | null>(null);
 
  useEffect(() => {
    // Load from Supabase if logged in, otherwise localStorage
    fetchTripsFromSupabase().then((remoteTrips) => {
      if (remoteTrips.length > 0) {
        setTrips(remoteTrips);
      } else {
        setTrips(readLocal());
      }
    });
 
    // Listen for local changes
    const handler = () => {
      fetchTripsFromSupabase().then((remoteTrips) => {
        if (remoteTrips.length > 0) setTrips(remoteTrips);
        else setTrips(readLocal());
      });
    };
    window.addEventListener("itineraries:changed", handler);
    window.addEventListener("storage", handler);
 
    // Listen for auth changes — reload trips when user logs in/out
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      handler();
    });
 
    return () => {
      window.removeEventListener("itineraries:changed", handler);
      window.removeEventListener("storage", handler);
      authListener.subscription.unsubscribe();
    };
  }, []);
 
  return trips;
}
 
export function useTrip(id: string | undefined) {
  const trips = useTrips();
  return trips?.find((t) => t.id === id);
}
 
export async function saveTrip(trip: Trip) {
  await saveTripToSupabase(trip);
  window.dispatchEvent(new Event("itineraries:changed"));
}
 
export async function deleteTrip(id: string) {
  await deleteTripFromSupabase(id);
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
          trip = {
            id: data.id,
            title: data.title,
            destination: data.destination,
            countryCode: data.country_code ?? undefined,
            days: data.days,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
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