import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useTrips } from "@/lib/storage";
import type { Trip } from "@/lib/types";
import { countryCodeToFlag, countryCodeToName } from "@/lib/countries";

export const Route = createFileRoute("/trips")({
  component: AllTripsPage,
});

const PAGE_SIZE = 12;

const TRIP_GRADIENTS = [
  "from-[#FFD9C9] via-[#FFE8D6] to-[#FFCFA8]",
  "from-[#E4D4F5] via-[#EDE4F7] to-[#D9C8F0]",
  "from-[#7FD8C9] via-[#9FE3D6] to-[#5CC9B8]",
  "from-[#FFE3A3] via-[#FFF0C9] to-[#FFD97A]",
  "from-[#C9E4FF] via-[#DCEEFF] to-[#A8CCF5]",
  "from-[#FFC9D6] via-[#FFE0E8] to-[#FF9EB5]",
];

function tripGradient(tripId: string): string {
  let h = 0;
  for (let i = 0; i < tripId.length; i++) h = (h * 31 + tripId.charCodeAt(i)) >>> 0;
  return TRIP_GRADIENTS[h % TRIP_GRADIENTS.length];
}

function AllTripsPage() {
  const trips = useTrips();
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const visibleTrips = filterCountry
    ? (trips ?? []).filter((t) => t.countryCode === filterCountry)
    : (trips ?? []);

  const sorted = [...visibleTrips].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (cc: string | null) => {
    setFilterCountry(cc);
    setPage(0);
  };

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
              onClick={() => handleFilter(null)}
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
                onClick={() => handleFilter(filterCountry === cc ? null : cc)}
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
        ) : paged.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            {filterCountry ? `No trips found for ${countryCodeToName(filterCountry)}.` : "No trips yet."}
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((t) => (
                <TripCard key={t.id} trip={t} />
              ))}
            </div>

            {pageCount > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-primary disabled:opacity-40 disabled:hover:border-border"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`h-9 w-9 rounded-full text-sm transition-colors ${
                      i === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:border-primary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page === pageCount - 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-primary disabled:opacity-40 disabled:hover:border-border"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const stopCount = trip.days.reduce((n, d) => n + d.stops.length, 0);
  const days = trip.days.length;
  return (
    <Link
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      className="group overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5"
    >
      <div className={`relative h-40 bg-gradient-to-br ${tripGradient(trip.id)} overflow-hidden`}>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/30" />
        <div className="absolute -left-10 top-14 h-24 w-24 rounded-full bg-white/30" />
        <div className="absolute right-10 bottom-5 h-10 w-10 rounded-full bg-white/30" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
            {trip.title}
          </h3>
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {days} day{days === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground truncate">{trip.destination}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {stopCount} stop{stopCount === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
