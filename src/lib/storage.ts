import { useCallback, useEffect, useState } from "react";
import type { Trip } from "./types";

const KEY = "itineraries.v1";

function read(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trip[]) : [];
  } catch {
    return [];
  }
}

function write(trips: Trip[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(trips));
  window.dispatchEvent(new Event("itineraries:changed"));
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  useEffect(() => {
    setTrips(read());
    const handler = () => setTrips(read());
    window.addEventListener("itineraries:changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("itineraries:changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return trips;
}

export function useTrip(id: string | undefined) {
  const trips = useTrips();
  return trips.find((t) => t.id === id);
}

export function saveTrip(trip: Trip) {
  const trips = read();
  const idx = trips.findIndex((t) => t.id === trip.id);
  const next = { ...trip, updatedAt: new Date().toISOString() };
  if (idx >= 0) trips[idx] = next;
  else trips.push(next);
  write(trips);
}

export function deleteTrip(id: string) {
  write(read().filter((t) => t.id !== id));
}

export function useUpdateTrip(id: string | undefined) {
  return useCallback(
    (updater: (trip: Trip) => Trip) => {
      if (!id) return;
      const trips = read();
      const idx = trips.findIndex((t) => t.id === id);
      if (idx < 0) return;
      trips[idx] = { ...updater(trips[idx]), updatedAt: new Date().toISOString() };
      write(trips);
    },
    [id],
  );
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
