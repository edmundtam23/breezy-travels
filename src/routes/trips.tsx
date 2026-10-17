import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { useTrips, deleteTrip } from "@/lib/storage";
import type { Trip } from "@/lib/types";
import { countryCodeToFlag, countryCodeToName } from "@/lib/countries";

export const Route = createFileRoute("/trips")({
  component: AllTripsPage,
});

function AllTripsPage() {
  const trips = useTrips();
  const [filterCountry, setFilterCountry] = useState<string | null>(null);

  const visibleTrips = filterCountry
    ? (trips ?? []).filter((t) => t.countryCode === filterCountry)
    : (trips ?? []);

  // Unique countries for filter
  const countries = [...new Set((trips ?? []).map((t) => t.countryCode).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-display text-xl font-semibold">All Trips</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          All <em className="italic text-primary">trips</em>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Every itinerary you have created, in one place.
        </p>

        {countries.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCountry(null)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                !filterCountry
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:border-primary"
              }`}
            >
              All
            </button>
            {countries.map((cc) => (
              <button
                key={cc}
                onClick={() => setFilterCountry(filterCountry === cc ? null : cc)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  filterCountry === cc
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:border-primary"
                }`}
              >
                {countryCodeToFlag(cc)} {countryCodeToName(cc)}
              </button>
            ))}
          </div>
        )}

        {trips === null ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : visibleTrips.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            {filterCountry ? `No trips found for ${countryCodeToName(filterCountry)}.` : "No trips yet."}
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...visibleTrips]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((t) => (
                <TripCard key={t.id} trip={t} />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const stopCount = trip.days.reduce((n, d) => n + d.stops.length, 0);
  return (
    <Card className="group transition hover:shadow-md relative overflow-hidden">
      {trip.countryCode && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: "150px",
            lineHeight: 1,
            opacity: 0.1,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {String.fromCodePoint(
            ...[...trip.countryCode.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
          )}
        </span>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{trip.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{trip.destination}</p>
          </div>
          <button
            aria-label="Delete trip"
            className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              if (confirm(`Delete "${trip.title}"?`)) deleteTrip(trip.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {trip.days.length} {trip.days.length === 1 ? "day" : "days"} · {stopCount} stops
          </span>
          <Link
            to="/trip/$tripId"
            params={{ tripId: trip.id }}
            className="font-medium text-primary hover:underline"
          >
            Open →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
