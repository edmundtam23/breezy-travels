import { DestinationHero } from "@/components/destination-hero";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Sparkles, Trash2, Calendar, Sun, Moon, Monitor, ChevronRight, ChevronLeft, User, Briefcase, Compass } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Trip } from "@/lib/types";
import { DemoTrip, DemoMapPanel } from "@/components/demo-trip";
import { DemoCta } from "@/components/demo-cta";

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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return user;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function countryCodeToFlag(code: string) {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function countryCodeToName(code: string) {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function UserInitials({ user }: { user: SupabaseUser }) {
  const initials = (user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary ring-1 ring-primary/20 cursor-pointer select-none">
      {initials}
    </div>
  );
}

// ── Menu content shared between Popover and Sheet ────────────────────────────

function AvatarMenuContent({
  user,
  trips,
  onClose,
  onSignOut,
}: {
  user: SupabaseUser;
  trips: Trip[];
  onClose: () => void;
  onSignOut: () => void;
}) {
  const [showTrips, setShowTrips] = useState(false);

  // Build country groups from trips that have a countryCode
  const countryGroups = trips.reduce<Record<string, number>>((acc, t) => {
    if (t.countryCode) {
      acc[t.countryCode] = (acc[t.countryCode] ?? 0) + 1;
    }
    return acc;
  }, {});
  const countries = Object.entries(countryGroups).sort((a, b) =>
    countryCodeToName(a[0]).localeCompare(countryCodeToName(b[0]))
  );

  if (showTrips) {
    return (
      <div className="w-56">
        {/* Sub-menu header */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <button
            onClick={() => setShowTrips(false)}
            className="rounded p-1 hover:bg-muted"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">My trips</span>
        </div>
        <div className="py-1 max-h-64 overflow-y-auto">
          {countries.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No trips yet.</p>
          ) : (
            countries.map(([code, count]) => (
              <Link
                key={code}
                to="/"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span className="text-base leading-none">{countryCodeToFlag(code)}</span>
                <span className="flex-1">{countryCodeToName(code)}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-56">
      {/* User info header */}
      <div className="flex items-center gap-3 border-b px-3 py-3">
        <UserInitials user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.email?.split("@")[0]}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          Profile
        </Link>

        <button
          onClick={() => setShowTrips(true)}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-left">My trips</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Compass className="h-4 w-4 text-muted-foreground" />
          Inspiration
        </Link>
      </div>
    </div>
  );
}

// ── Responsive avatar menu ────────────────────────────────────────────────────

function AvatarMenu({
  user,
  trips,
  onSignOut,
}: {
  user: SupabaseUser;
  trips: Trip[];
  onSignOut: () => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button aria-label="Open menu">
            <UserInitials user={user} />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <div className="pt-10">
            <AvatarMenuContent
              user={user}
              trips={trips}
              onClose={() => setOpen(false)}
              onSignOut={onSignOut}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Open menu">
          <UserInitials user={user} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="p-0">
        <AvatarMenuContent
          user={user}
          trips={trips}
          onClose={() => setOpen(false)}
          onSignOut={onSignOut}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

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

// ── HomePage ──────────────────────────────────────────────────────────────────

function HomePage() {
  const trips = useTrips();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [newTripOpen, setNewTripOpen] = useState(false);

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
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
                <ThemeToggle />
                {/* New trip button — desktop only */}
                <div className="hidden sm:flex">
                  <NewTripDialog open={newTripOpen} onOpenChange={setNewTripOpen} />
                </div>
                <AvatarMenu user={user} trips={trips} onSignOut={handleSignOut} />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">Sign in</Button>
                </Link>
                <Link to="/signup" className="hidden sm:block">
                  <Button size="sm">Sign up</Button>
                </Link>
                <ThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your trips</h1>
        <p className="mt-2 text-muted-foreground">
          Plan day-by-day itineraries, reorder stops on a map, and catch tight commute
          windows before they catch you.
        </p>

        {!user && (
          <div className="hidden md:block mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
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
          !user ? (
            <UnauthenticatedHomepage />
          ) : (
            <EmptyState onNewTrip={() => setNewTripOpen(true)} />
          )
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <TripCard key={t.id} trip={t} />
            ))}
          </div>
        )}

        {/* FAB — mobile only, logged-in only */}
        {user && (
          <button
            onClick={() => setNewTripOpen(true)}
            aria-label="New trip"
            className="sm:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {/* Hidden dialog driven by FAB on mobile */}
        <div className="sm:hidden">
          <NewTripDialog open={newTripOpen} onOpenChange={setNewTripOpen} />
        </div>
      </main>
    </div>
  );
}

// ── Unauthenticated homepage ──────────────────────────────────────────────────

function UnauthenticatedHomepage() {
  return (
    <section className="relative mt-8 overflow-hidden">
      <DestinationHero />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_380px]">
        <div>
          <DemoTrip />
        </div>
        <DemoMapPanel />
      </div>
      <div className="pb-24 md:pb-0">
        <DemoCta />
      </div>
    </section>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onNewTrip }: { onNewTrip: () => void }) {
  return (
    <div className="mt-12 rounded-xl border border-dashed p-12 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-medium">No trips yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate one with AI or start from a blank slate.
      </p>
      <div className="mt-6">
        <Button onClick={onNewTrip}>
          <Plus className="mr-1 h-4 w-4" /> New trip
        </Button>
      </div>
    </div>
  );
}

// ── Trip card ─────────────────────────────────────────────────────────────────

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
            opacity: 0.10,
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

// ── New trip dialog ───────────────────────────────────────────────────────────

function NewTripDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [tab, setTab] = useState("ai");
  const [prompt, setPrompt] = useState("");
  const [days, setDays] = useState<number | "">(2);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<FocusValue>("mix");
  const navigate = useNavigate();
  const aiFn = useServerFn(generateItinerary);

  const reset = useCallback(() => {
    setPrompt("");
    setDays(2);
    setTitle("");
    setDestination("");
    setLoading(false);
    setFocus("mix");
  }, []);

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
        countryCode: res.countryCode,
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
      onOpenChange(false);
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
    onOpenChange(false);
    reset();
    navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
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