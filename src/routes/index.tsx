import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Sparkles, Trash2, Calendar, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useTrips, saveTrip, deleteTrip, newId } from "@/lib/storage";
import { generateItinerary } from "@/lib/itinerary.functions";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { getTheme, setTheme, nextTheme, type Theme } from "@/lib/theme";
import type { User } from "@supabase/supabase-js";
import type { Trip } from "@/lib/types";
// ── NEW ───────────────────────────────────────────────────────────────────────
import { DemoTrip, DemoMapPanel } from "@/components/demo-trip";
import { DemoCta } from "@/components/demo-cta";
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Breezy Plans — AI-Powered Trip Planner" },
      {
        name: "description",
        content:
          "Plan your next trip with AI. Build day-by-day itineraries, explore stops on a map, and travel smarter with Breezy Plans.",
      },
    ],
  }),
  component: HomePage,
});

const FOCUS_OPTIONS = [
  {
    value: "food",
    label: "🍜 Food",
    prompt:
      "Prioritize highly-rated local restaurants, food markets, street food, cafes, and unique dining experiences. Avoid generic tourist traps.",
  },
  {
    value: "sights",
    label: "🏛 Sights",
    prompt:
      "Focus on iconic landmarks, museums, historical sites, and must-see attractions. Include context about each location's significance.",
  },
  {
    value: "outdoors",
    label: "🌿 Outdoors",
    prompt:
      "Prioritize parks, hiking trails, beaches, nature reserves, and outdoor activities. Include practical tips like best times to visit.",
  },
  {
    value: "culture",
    label: "🎨 Culture",
    prompt:
      "Focus on art galleries, theatres, local neighbourhoods, street art, live music venues, and authentic cultural experiences.",
  },
  {
    value: "mix",
    label: "✨ Mix",
    prompt:
      "Create a balanced mix of food, sightseeing, culture, and outdoor experiences for a well-rounded itinerary.",
  },
] as const;

type FocusValue = (typeof FOCUS_OPTIONS)[number]["value"];

function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return user;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") return <Sun className="h-4 w-4" />;
  if (theme === "dark") return <Moon className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const handleClick = () => {
    const next = nextTheme(theme);
    setTheme(next);
    setThemeState(next);
  };

  const label =
    theme === "light" ? "Light mode" : theme === "dark" ? "Dark mode" : "System mode";

  return (
    <button
      onClick={handleClick}
      aria-label={`Current: ${label}. Click to switch.`}
      title={label}
      className="rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

function HomePage() {
  const trips = useTrips();
  const user = useCurrentUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Breezy Plans</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.email?.split("@")[0]}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">Sign in</Button>
                </Link>
                <Link to="/signup" className="hidden sm:block">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
            <ThemeToggle />
            {user && <NewTripDialog />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your trips</h1>
        <p className="mt-2 text-muted-foreground">
          Plan day-by-day itineraries, reorder stops on a map, and catch tight commute
          windows before they catch you.
        </p>

        {!user && (
          <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>{" "}
            or{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              sign in
            </Link>{" "}
            to save your trips across devices.
          </div>
        )}

        {trips.length === 0 ? (
          // ── Show demo for logged-out users, empty state for logged-in ────────
          !user ? (
            <UnauthenticatedHomepage />
          ) : (
            <EmptyState />
          )
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── NEW: Unauthenticated homepage with live demo ──────────────────────────────

function UnauthenticatedHomepage() {
  return (
    /*
     * `relative` + `overflow-hidden` gives the desktop sticky bar (`position:
     * sticky; bottom: 0`) a proper scroll container to stick inside, so it
     * anchors to the bottom of this section rather than the page.
     */
    <section className="relative mt-8 overflow-hidden">
      {/* Sample itinerary label — plain text, no badge */}
      <p className="mb-4 text-sm text-muted-foreground">
        Sample itinerary —{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          sign up to generate your own
        </Link>
      </p>

      {/*
       * Desktop: two-column grid — trip card left, map placeholder right.
       * Mobile: single column, trip card only (map is the native app view).
       */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">

        {/* Left: demo trip card */}
        <div>
          <DemoTrip />
        </div>

        {/* Right: static map — desktop only, rendered inside DemoMapPanel */}
        <DemoMapPanel />
      </div>

      {/* CTA — floating pill on mobile, sticky bar on desktop */}
      {/* Extra bottom padding on mobile so content doesn't hide behind the pill */}
      <div className="pb-24 md:pb-0">
        <DemoCta />
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-12 rounded-xl border border-dashed p-12 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-medium">No trips yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate one with AI or start from a blank slate.
      </p>
      <div className="mt-6">
        <NewTripDialog />
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const stopCount = trip.days.reduce((n, d) => n + d.stops.length, 0);
  return (
    <Card className="group transition hover:shadow-md">
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

function NewTripDialog() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ai");
  const [prompt, setPrompt] = useState("");
  const [days, setDays] = useState<number | "">(2);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<FocusValue>("mix");
  const navigate = useNavigate();
  const aiFn = useServerFn(generateItinerary);

  const reset = () => {
    setPrompt("");
    setDays(2);
    setTitle("");
    setDestination("");
    setLoading(false);
    setFocus("mix");
  };

  const handleAi = async () => {
    if (!prompt.trim()) {
      toast.error("Add a quick prompt to start.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? "";
    if (!token) {
      toast.error(
        <span>
          Please{" "}
          <a href="/login" className="underline font-medium">sign in</a>
          {" "}or{" "}
          <a href="/signup" className="underline font-medium">create an account</a>
          {" "}to generate itineraries.
        </span>
      );
      return;
    }
    const numDays = Number(days) || 1;
    const focusSnippet = FOCUS_OPTIONS.find((f) => f.value === focus)?.prompt ?? "";
    const enrichedPrompt = `${prompt.trim()}\n\nFocus preference: ${focusSnippet}`;
    setLoading(true);
    try {
      const res = await aiFn({ data: { prompt: enrichedPrompt, days: numDays, token } });
      const trip: Trip = {
        id: newId(),
        title: res.title,
        destination: res.destination,
        days: res.days.map((d) => ({
          id: newId(),
          title: d.title,
          summary: d.summary,
          stops: d.stops.map((s) => ({
            id: newId(),
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            time: s.time,
            durationMin: s.durationMin,
            blurb: s.blurb,
            visitTip: s.visitTip ?? null,
            category: s.category,
            travelModeToNext: s.travelModeToNext,
          })),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTrip(trip);
      setOpen(false);
      reset();
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate itinerary");
      setLoading(false);
    }
  };

  const handleBlank = async () => {
    if (!title.trim() || !destination.trim()) {
      toast.error("Trip title and destination are required.");
      return;
    }
    const numDays = Number(days) || 1;
    const trip: Trip = {
      id: newId(),
      title: title.trim(),
      destination: destination.trim(),
      days: Array.from({ length: numDays }, (_, i) => ({
        id: newId(),
        title: `Day ${i + 1}`,
        summary: "",
        stops: [],
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveTrip(trip);
    setOpen(false);
    reset();
    navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New trip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New trip</DialogTitle>
          <DialogDescription>Generate a draft with AI or start blank.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">
              <Sparkles className="mr-1 h-4 w-4" /> AI draft
            </TabsTrigger>
            <TabsTrigger value="blank">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Trip idea</Label>
              <Textarea
                id="prompt"
                rows={3}
                placeholder="e.g. 2 days in San Francisco, foodie & murals focus"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Trip focus</Label>
              <div className="flex flex-wrap gap-2 sm:justify-center">
                {FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFocus(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
                      focus === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="days-ai">Days</Label>
              <Input
                id="days-ai"
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => {
                  let value = e.target.value === "" ? "" : Number(e.target.value);
                  if (typeof value === "number" && value > 14) value = 14;
                  if (typeof value === "number" && value < 1) value = 1;
                  setDays(value);
                }}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAi} disabled={loading}>
                {loading ? "Generating…" : "Generate itinerary"}
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="blank" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Weekend in Lisbon"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest">Destination</Label>
              <Input
                id="dest"
                placeholder="Lisbon, Portugal"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days-b">Days</Label>
              <Input
                id="days-b"
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => {
                  let value = e.target.value === "" ? "" : Number(e.target.value);
                  if (typeof value === "number" && value > 14) value = 14;
                  if (typeof value === "number" && value < 1) value = 1;
                  setDays(value);
                }}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleBlank}>Create trip</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}