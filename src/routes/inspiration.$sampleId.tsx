import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { saveTrip } from "@/lib/storage";
import { downloadTripHtml } from "@/lib/export-trip-html";
import { StopPhoto } from "@/components/stop-photo";
import { MapPanel } from "@/components/map-panel";
import {
  SAMPLE_TRIPS,
  sampleToTrip,
  type SampleTrip,
} from "@/lib/sample-trips";
import { Download } from "lucide-react";

export const Route = createFileRoute("/inspiration/$sampleId")({
  component: SampleDetailPage,
});

function SampleDetailPage() {
  const { sampleId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  const sample: SampleTrip | undefined = SAMPLE_TRIPS.find(
    (s) => s.id === sampleId
  );

  if (!sample) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Toaster />
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">Sample not found</p>
          <Link to="/inspiration">
            <Button variant="link" className="mt-4">
              Back to inspiration
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleUseAsStartingPoint = async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setSaving(true);
    try {
      const trip = sampleToTrip(sample);
      await saveTrip(trip);
      toast.success("Sample saved to your trips — make it yours!");
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save trip.");
      setSaving(false);
    }
  };

  const totalStops = sample.days.reduce((n, d) => n + d.stops.length, 0);
  const day = sample.days[activeDay];

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/inspiration" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Inspiration
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTripHtml(sampleToTrip(sample))}
            >
              <Download className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Download HTML</span>
            </Button>
            {user ? (
              <Button size="sm" onClick={handleUseAsStartingPoint} disabled={saving}>
                {saving ? "Saving…" : "Use as starting point"}
              </Button>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in to use this trip</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Sample itinerary
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{sample.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {sample.destination} · {sample.days.length} day{sample.days.length === 1 ? "" : "s"} ·{" "}
          {totalStops} stop{totalStops === 1 ? "" : "s"}
        </p>
        <p className="mt-3 max-w-2xl">{sample.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sample.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>

        {/* Day tabs */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {sample.days.map((d, i) => (
            <Button
              key={d.id}
              variant={i === activeDay ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveDay(i)}
              className="shrink-0"
            >
              Day {i + 1}
            </Button>
          ))}
        </div>

        {/* Map */}
        <div className="mt-4 overflow-hidden rounded-xl border">
          <MapPanel
            stops={day.stops}
            activeStopId={null}
            onSelect={() => {}}
          />
        </div>

        {/* Stops */}
        <div className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">
            Day {activeDay + 1}
            {day.title && day.title !== `Day ${activeDay + 1}` ? ` — ${day.title}` : ""}
          </h2>
          {day.summary && (
            <p className="text-sm text-muted-foreground">{day.summary}</p>
          )}
          {day.stops.map((stop, si) => (
            <div
              key={stop.id}
              className="flex gap-4 rounded-xl border bg-card p-4"
            >
              {user ? (
                <StopPhoto
                  placeId={stop.placeId}
                  name={stop.name}
                  category={stop.category}
                  index={si}
                />
              ) : null}
              <div className="flex w-16 flex-none flex-col">
                <span className="font-mono text-sm font-semibold">
                  {stop.time || `Stop ${si + 1}`}
                </span>
                {stop.durationMin ? (
                  <span className="text-xs text-muted-foreground">
                    {stop.durationMin} min
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{stop.name}</p>
                {stop.address && (
                  <p className="text-xs text-muted-foreground">{stop.address}</p>
                )}
                {stop.blurb && (
                  <p className="mt-1 text-sm text-muted-foreground">{stop.blurb}</p>
                )}
                {stop.visitTip && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Tip:</span> {stop.visitTip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border bg-muted/50 p-6 text-center">
          <p className="font-medium">Like this itinerary?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save it to your trips and customize every stop.
          </p>
          {user ? (
            <Button className="mt-4" onClick={handleUseAsStartingPoint} disabled={saving}>
              {saving ? "Saving…" : "Use as starting point"}
            </Button>
          ) : (
            <Link to="/login">
              <Button className="mt-4">Sign in to use this trip</Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
