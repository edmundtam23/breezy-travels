import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { useTrips, saveTrip } from "@/lib/storage";
import type { Trip } from "@/lib/types";
import {
  SAMPLE_TRIPS,
  getInspirationMode,
  regionLabel,
  sampleToTrip,
  type SampleTrip,
} from "@/lib/sample-trips";
import { PACE_OPTIONS, BUDGET_OPTIONS } from "@/lib/focus-options";
import { enrichTripWithPlaceIds, useGoogleMapsKey } from "@/lib/place-photos";

export const Route = createFileRoute("/inspiration")({
  component: InspirationPage,
});

function paceLabel(v?: string) {
  return PACE_OPTIONS.find((p) => p.value === v)?.label ?? v;
}
function budgetLabel(v?: string) {
  return BUDGET_OPTIONS.find((b) => b.value === v)?.label ?? v;
}

function samplePromptText(sample: SampleTrip): string {
  return `Inspired by the sample itinerary: ${sample.title}`;
}

function findExistingCopy(trips: Trip[] | null, sample: SampleTrip): Trip | undefined {
  if (!trips) return undefined;
  const marker = samplePromptText(sample);
  return trips.find((t) => t.promptText === marker);
}

function SampleCard({ sample, featured }: { sample: SampleTrip; featured?: boolean }) {
  const days = sample.days.length;
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapsKey = useGoogleMapsKey();
  const trips = useTrips();
  const [generating, setGenerating] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [existingTrip, setExistingTrip] = useState<Trip | null>(null);

  const doGenerate = async () => {
    setGenerating(true);
    try {
      const trip = sampleToTrip(sample);
      await saveTrip(trip);
      // Resolve place_ids for photo thumbnails (same as normal generation).
      if (mapsKey) {
        try {
          const enriched = await enrichTripWithPlaceIds(trip, mapsKey);
          await saveTrip(enriched);
        } catch {
          // Photo enrichment is best-effort; the trip is already saved.
        }
      }
      toast.success("Trip created — customize it from the trip page!");
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create trip.");
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    // Guardrail: warn if they already created a trip from this sample.
    const existing = findExistingCopy(trips, sample);
    if (existing) {
      setExistingTrip(existing);
      setShowDuplicate(true);
      return;
    }
    await doGenerate();
  };

  return (
    <>
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-lg cursor-pointer ${
        featured ? "ring-2 ring-primary" : ""
      }`}
      onClick={handleGenerate}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-lg leading-tight">
              {sample.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {sample.destination}
            </p>
          </div>
          {featured && (
            <Badge variant="default" className="shrink-0">
              <Sparkles className="mr-1 h-3 w-3" />
              For you
            </Badge>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{sample.tagline}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {days} day{days === 1 ? "" : "s"}
          </Badge>
          {sample.pace && <Badge variant="outline">{paceLabel(sample.pace)}</Badge>}
          {sample.budget && (
            <Badge variant="outline">{budgetLabel(sample.budget)}</Badge>
          )}
        </div>
        {generating && (
          <p className="mt-3 text-sm text-muted-foreground">Creating your trip…</p>
        )}
      </CardContent>
    </Card>

      <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already in your trips</DialogTitle>
            <DialogDescription>
              You&apos;ve already created a trip from &ldquo;{sample.title}&rdquo;.
              Want to view it, or create another copy?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            {existingTrip && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowDuplicate(false);
                  navigate({
                    to: "/trip/$tripId",
                    params: { tripId: existingTrip.id },
                  });
                }}
              >
                View existing trip
              </Button>
            )}
            <Button
              onClick={() => {
                setShowDuplicate(false);
                doGenerate();
              }}
            >
              Create another copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InspirationPage() {
  const trips = useTrips();
  const navigate = useNavigate();

  // useTrips() returns null while loading — treat as "still deciding".
  const mode = trips ? getInspirationMode(trips) : { mode: "all" as const };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Toaster />
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Compass className="h-6 w-6" />
          Inspiration
        </h1>
        <p className="mt-1 text-muted-foreground">
          Hand-picked itineraries to spark your next trip. Open one to explore,
          or use it as a starting point for your own.
        </p>
      </div>

      {mode.mode === "try-different" && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">
            Try something different
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Your trips have all been in {regionLabel(mode.userRegion)} — here&apos;s
            an idea from somewhere new.
          </p>
          <SampleCard sample={mode.suggestion} featured />
        </div>
      )}

      {mode.mode === "popular" && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Popular right now</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SAMPLE_TRIPS.slice(0, 2).map((s) => (
              <SampleCard key={s.id} sample={s} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {mode.mode === "all" ? "Sample itineraries" : "Browse all"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_TRIPS.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      </div>

      <div className="mt-10 text-center">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/", search: { newTrip: true } })}
        >
          Plan your own trip
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
