import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getSharedTrip } from "@/lib/share.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { saveTrip, newId } from "@/lib/storage";
import { downloadTripHtml } from "@/lib/export-trip-html";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { MapPin, Download, Copy, Check } from "lucide-react";
import type { Trip } from "@/lib/types";

export const Route = createFileRoute("/share/$token")({
  component: SharePage,
});

function SharePage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const getTrip = useServerFn(getSharedTrip);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getTrip({ data: { token } })
      .then(setTrip)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load shared trip.")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSaveCopy = async () => {
    if (!trip) return;
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      navigate({ to: "/login" });
      return;
    }
    setSaving(true);
    try {
      const copy: Trip = {
        ...trip,
        id: newId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTrip(copy);
      toast.success("Trip saved to your trips.");
      navigate({ to: "/trip/$tripId", params: { tripId: copy.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save trip.");
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Toaster />
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold">This link didn't work</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link to="/">
            <Button variant="link" className="mt-4">
              Back home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Toaster />
        <p className="text-muted-foreground">Loading shared trip…</p>
      </div>
    );
  }

  const totalStops = trip.days.reduce((n, d) => n + d.stops.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Breezy Plans</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadTripHtml(trip)}>
              <Download className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Download HTML</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
            </Button>
            {user ? (
              <Button size="sm" onClick={handleSaveCopy} disabled={saving}>
                {saving ? "Saving…" : "Save a copy to my trips"}
              </Button>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in to save a copy</Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Shared itinerary
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{trip.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {trip.destination} · {trip.days.length} day{trip.days.length === 1 ? "" : "s"} ·{" "}
          {totalStops} stop{totalStops === 1 ? "" : "s"}
        </p>

        <div className="mt-8 space-y-10">
          {trip.days.map((day, di) => (
            <section key={day.id}>
              <h2 className="text-xl font-semibold">
                Day {di + 1}
                {day.title && day.title !== `Day ${di + 1}` ? ` — ${day.title}` : ""}
              </h2>
              {day.summary && (
                <p className="mt-1 text-sm text-muted-foreground">{day.summary}</p>
              )}
              <div className="mt-4 space-y-3">
                {day.stops.map((stop, si) => (
                  <div
                    key={stop.id}
                    className="flex gap-4 rounded-xl border bg-card p-4"
                  >
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
                {day.stops.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No stops planned for this day yet.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <p className="text-xs text-muted-foreground">Planned with Breezy Plans</p>
        </div>
      </footer>
    </div>
  );
}
