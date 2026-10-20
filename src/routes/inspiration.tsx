import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
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

  // Gradient per sample (matching homepage)
  const gradients: Record<string, string> = {
    tokyo: "from-[#FFD9C9] via-[#FFE8D6] to-[#FFCFA8]",
    paris: "from-[#E4D4F5] via-[#EDE4F7] to-[#D9C8F0]",
    bali: "from-[#7FD8C9] via-[#9FE3D6] to-[#5CC9B8]",
  };
  const gradient = gradients[sample.id] || "from-primary/20 to-primary/10";

  return (
    <>
    <div
      className={`group overflow-hidden rounded-2xl bg-card shadow-[0_2px_16px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 cursor-pointer ${
        featured ? "ring-2 ring-primary" : ""
      }`}
      onClick={handleGenerate}
    >
      <div className={`relative h-44 bg-gradient-to-br ${gradient} overflow-hidden`}>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/30" />
        <div className="absolute -left-10 top-16 h-24 w-24 rounded-full bg-white/30" />
        <div className="absolute right-12 bottom-6 h-10 w-10 rounded-full bg-white/30" />
        {featured && (
          <span className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            For you
          </span>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">
            {sample.title}
          </h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {days} day{days === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{sample.destination}</p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{sample.tagline}</p>
        {(sample.pace || sample.budget) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sample.pace && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {paceLabel(sample.pace)}
              </span>
            )}
            {sample.budget && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {budgetLabel(sample.budget)}
              </span>
            )}
          </div>
        )}
        {generating && (
          <p className="mt-3 text-sm text-muted-foreground">Creating your trip…</p>
        )}
      </div>
    </div>

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
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-display text-xl font-semibold">Inspiration</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Get <em className="italic text-primary">inspired</em>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Hand-picked itineraries to spark your next trip. Open one to explore,
          or use it as a starting point for your own.
        </p>
      </div>

      {mode.mode === "try-different" && (
        <div className="mb-12">
          <h2 className="mb-2 font-display text-2xl font-semibold">
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
        <div className="mb-12">
          <h2 className="mb-2 font-display text-2xl font-semibold">Popular right now</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {SAMPLE_TRIPS.slice(0, 2).map((s) => (
              <SampleCard key={s.id} sample={s} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-6 font-display text-2xl font-semibold">
          {mode.mode === "all" ? "Sample itineraries" : "Browse all"}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_TRIPS.map((s) => (
            <SampleCard key={s.id} sample={s} />
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Button
          onClick={() => navigate({ to: "/", search: { newTrip: true } })}
          className="rounded-full px-8"
        >
          Plan your own trip
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      </div>
    </div>
  );
}
