import { DestinationHero } from "@/components/destination-hero";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Sparkles, Trash2, Calendar, Sun, Moon, Monitor, ChevronRight, ChevronLeft, User, Briefcase, Compass, LogOut, Loader2, Pencil } from "lucide-react";
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
import { deferAutoLogout, resumeAutoLogout } from "@/lib/use-session-timeout";
import { generateItinerary } from "@/lib/itinerary.functions";
import { enrichTripWithPlaceIds, geocodeAccommodation, useGoogleMapsKey } from "@/lib/place-photos";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/auth";
import { getTheme, setTheme, nextTheme, type Theme } from "@/lib/theme";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Trip } from "@/lib/types";
import { DemoTrip, DemoMapPanel } from "@/components/demo-trip";
import { DemoCta } from "@/components/demo-cta";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    newTrip: search.newTrip === true || search.newTrip === "true",
  }),
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

import { FOCUS_OPTIONS, PACE_OPTIONS, BUDGET_OPTIONS, type FocusValue, type PaceValue, type BudgetValue } from "@/lib/focus-options";

// Neutral loading state shown while the persisted session is being checked.
// Rendering this instead of the logged-out UI prevents the flash of the
// unauthenticated homepage when navigating while logged in.
function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
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

function getDisplayName(user: SupabaseUser): string {
  return user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "?";
}

const DEFAULT_AVATAR_COLOR = "bg-primary/10 text-primary ring-primary/20";

function UserInitials({ user }: { user: SupabaseUser }) {
  const initials = getDisplayName(user).slice(0, 1).toUpperCase();
  const colorClass = user.user_metadata?.avatar_color ?? DEFAULT_AVATAR_COLOR;
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ring-1 cursor-pointer select-none ${colorClass}`}>
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
  onFilterCountry,
}: {
  user: SupabaseUser;
  trips: Trip[];
  onClose: () => void;
  onSignOut: () => void;
  onFilterCountry: (code: string | null) => void;
}) {
  const [showTrips, setShowTrips] = useState(false);

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
          {/* All Trips */}
          <button
            onClick={() => { onFilterCountry(null); onClose(); }}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="text-base leading-none">🌍</span>
            <span className="flex-1 text-left">All Trips</span>
            <span className="text-xs text-muted-foreground">{trips.length}</span>
          </button>
          {/* Divider */}
          {countries.length > 0 && <div className="my-1 border-t" />}
          {/* Per-country */}
          {countries.map(([code, count]) => (
            <button
              key={code}
              onClick={() => { onFilterCountry(code); onClose(); }}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span className="text-base leading-none">{countryCodeToFlag(code)}</span>
              <span className="flex-1 text-left">{countryCodeToName(code)}</span>
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-56">
      <div className="flex items-center gap-3 border-b px-3 py-3">
        <UserInitials user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{getDisplayName(user)}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="py-1">
        <Link
          to="/profile"
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
          <span className="flex-1 text-left">My Trips</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        <Link
          to="/inspiration"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <Compass className="h-4 w-4 text-muted-foreground" />
          Inspiration
        </Link>
      </div>

      {/* Divider + sign out */}
      <div className="border-t py-1">
        <button
          onClick={() => { onClose(); onSignOut(); }}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Responsive avatar menu ────────────────────────────────────────────────────

function AvatarMenu({
  user,
  trips,
  onSignOut,
  onFilterCountry,
}: {
  user: SupabaseUser;
  trips: Trip[];
  onSignOut: () => void;
  onFilterCountry: (code: string | null) => void;
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
              onFilterCountry={onFilterCountry}
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
          onFilterCountry={onFilterCountry}
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


// ── Logo ────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        className="h-5 w-5"
        aria-hidden
      >
        <path d="M3 8h9a3 3 0 1 0-3-3" />
        <path d="M3 12h13a3 3 0 1 1-3 3" />
        <path d="M3 16h6" />
      </svg>
    </span>
  );
}

// ── New visitor hero ────────────────────────────────────────────────────────

function HeroSection({ onPlanTrip }: { onPlanTrip: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onPlanTrip(prompt.trim());
    setPrompt("");
  };

  const examples = [
    "A long weekend in Lisbon",
    "Five slow days in Kyoto",
    "Family trip to the Amalfi Coast",
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 pt-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/[0.07] via-[#FDFBF6] to-primary/[0.04] border border-primary/10 px-6 py-16 sm:py-20">
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-foreground">
            Where to <em className="italic text-primary">next?</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Tell Breezy the trip you are dreaming of, and our AI crafts a day-by-day
            itinerary for you, thoughtfully paced, mapped out, and ready to wander.
            No spreadsheets, no stress.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl">
            <div className="flex items-center gap-2 rounded-full border-[1.5px] border-[#9CCFC4] bg-white p-2 pl-6 shadow-[0_6px_24px_4px_rgba(74,155,142,0.12),0_2px_8px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_32px_6px_rgba(74,155,142,0.16),0_2px_8px_rgba(0,0,0,0.06)]">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your dream trip..."
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" className="rounded-full px-6">
                Plan my trip
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-border bg-white px-4 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Decorative wave at card bottom */}
        <svg className="absolute bottom-0 left-0 w-full text-primary/[0.08]" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" />
        </svg>
      </div>
    </section>
  );
}

// ── How it works ────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: Pencil,
      step: "Step one",
      title: "Describe your trip",
      desc: "A sentence is enough: where you're headed, when, and the vibe you're after.",
    },
    {
      icon: Sparkles,
      step: "Step two",
      title: "AI crafts your days",
      desc: "Breezy shapes each day around what's nearby, so you wander more and backtrack less.",
    },
    {
      icon: MapPin,
      step: "Step three",
      title: "Explore with map & photos",
      desc: "Every stop pinned on a map with real photos, ready to nudge, swap, or save for later.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <h2 className="text-center font-display text-4xl font-semibold tracking-tight">
        Planning, minus the <em className="italic text-primary">planning</em>
        <br />
        <em className="italic text-primary">headache</em>
      </h2>
      <p className="mt-4 text-center text-muted-foreground">
        Three gentle steps between you and the good part.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-5 font-display text-sm italic text-primary">{s.step}</p>
            <h3 className="mt-2 font-display text-xl font-semibold">{s.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}


// ── Quick create bar (returning users) ──────────────────────────────────────

function QuickCreateBar({ onPlanTrip }: { onPlanTrip: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onPlanTrip(prompt.trim());
    setPrompt("");
  };

  return (
    <section className="border-b bg-white/50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="font-display text-2xl font-semibold whitespace-nowrap">
            Where to next?
          </h2>
          <div className="flex flex-1 items-center gap-2 rounded-full border-[1.5px] border-[#9CCFC4] bg-white p-2 pl-6 shadow-[0_6px_24px_4px_rgba(74,155,142,0.12),0_2px_8px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_8px_32px_6px_rgba(74,155,142,0.16)]">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your dream trip..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" className="rounded-full px-6">
              Plan
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ── Inspiration preview ─────────────────────────────────────────────────────

function InspirationPreview({ compact }: { compact?: boolean }) {
  const samples = [
    {
      id: "tokyo",
      title: "Tokyo in 4 Days",
      destination: "Tokyo, Japan",
      days: "4 days",
      desc: "Neon nights, quiet shrines, and the best ramen of your life, paced so you can actually enjoy it.",
      gradient: "from-[#FFD9C9] via-[#FFE8D6] to-[#FFCFA8]",
      accent: "bg-white/30",
    },
    {
      id: "paris",
      title: "Paris in 3 Days",
      destination: "Paris, France",
      days: "3 days",
      desc: "Museums in the morning, café terraces by afternoon, and a stroll along the Seine every evening.",
      gradient: "from-[#E4D4F5] via-[#EDE4F7] to-[#D9C8F0]",
      accent: "bg-white/30",
    },
    {
      id: "bali",
      title: "Bali Slow Week",
      destination: "Bali, Indonesia",
      days: "7 days",
      desc: "Jungle mornings, temple afternoons, and sunsets that never once feel rushed.",
      gradient: "from-[#7FD8C9] via-[#9FE3D6] to-[#5CC9B8]",
      accent: "bg-white/25",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-display text-4xl font-semibold tracking-tight">
        Get <em className="italic text-primary">inspired</em>
      </h2>
      <p className="mt-3 text-muted-foreground">
        A few journeys we love, ready to make your own.
      </p>
      {!compact && (
        <div className="mt-2 flex justify-end">
          <Link to="/inspiration" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
      )}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {samples.map((s) => (
          <Link
            key={s.id}
            to="/inspiration"
            className="group overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5"
          >
            <div className={`relative h-44 bg-gradient-to-br ${s.gradient} overflow-hidden`}>
              {/* Decorative circles */}
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${s.accent}`} />
              <div className={`absolute -left-10 top-16 h-24 w-24 rounded-full ${s.accent}`} />
              <div className={`absolute right-12 bottom-6 h-10 w-10 rounded-full ${s.accent}`} />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">
                  {s.title}
                </h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {s.days}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.destination}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
      {compact && (
        <div className="mt-6 text-right">
          <Link to="/inspiration" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
      )}
    </section>
  );
}


function HomePage() {
  const trips = useTrips();
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const { newTrip } = Route.useSearch();
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);

  const handlePlanTrip = (prompt: string) => {
    setPrefillPrompt(prompt);
    setNewTripOpen(true);
  };

  // Auto-open the New Trip dialog when arriving with ?newTrip=true
  // (e.g. from the Inspiration page's "Plan your own trip" button).
  useEffect(() => {
    if (newTrip) {
      setNewTripOpen(true);
      // Clear the param so it doesn't reopen on refresh.
      navigate({ to: "/", search: {}, replace: true });
    }
  }, [newTrip]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const visibleTrips = filterCountry
    ? trips.filter((t) => t.countryCode === filterCountry)
    : trips;

  if (status === "loading" || trips === null) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              onClick={() => setFilterCountry(null)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Logo />
              <span className="font-display text-xl font-semibold">Breezy Plans</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/inspiration"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Inspiration
              </Link>
              <Link
                to={user ? "/" : "/login"}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                My Trips
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <ThemeToggle />
                <div className="hidden sm:flex">
                  <NewTripDialog
                    open={newTripOpen}
                    onOpenChange={setNewTripOpen}
                    prefillPrompt={prefillPrompt}
                    onPrefillConsumed={() => setPrefillPrompt(null)}
                  />
                </div>
                <AvatarMenu
                  user={user}
                  trips={trips}
                  onSignOut={handleSignOut}
                  onFilterCountry={setFilterCountry}
                />
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

      <main className="flex-1">
        {trips.length === 0 ? (
          <>
            <HeroSection onPlanTrip={handlePlanTrip} />
            <HowItWorks />
            <InspirationPreview />
          </>
        ) : (
          <>
            <QuickCreateBar onPlanTrip={handlePlanTrip} />
            <section className="mx-auto max-w-6xl px-6 py-12">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">Continue planning</h2>
                {filterCountry && (
                  <button
                    onClick={() => setFilterCountry(null)}
                    className="text-sm text-primary hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              {filterCountry && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Filtered by {countryCodeToFlag(filterCountry)} {countryCodeToName(filterCountry)}
                </p>
              )}
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleTrips.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
                {visibleTrips.length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No trips found for {countryCodeToName(filterCountry!)}.
                  </p>
                )}
              </div>
            </section>
            <InspirationPreview compact />
          </>
        )}

        {/* FAB — mobile only, logged-in only */}
        {user && (
          <>
            <button
              onClick={() => setNewTripOpen(true)}
              aria-label="New trip"
              className="sm:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
            {/* Dialog controlled by FAB — rendered once, no trigger button */}
            <Dialog open={newTripOpen} onOpenChange={setNewTripOpen}>
              <NewTripDialogContent
                open={newTripOpen}
                onOpenChange={setNewTripOpen}
                prefillPrompt={prefillPrompt}
                onPrefillConsumed={() => setPrefillPrompt(null)}
              />
            </Dialog>
          </>
        )}
      </main>
      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">© 2026 Breezy Plans</p>
          <div className="flex items-center gap-4">
            <Link
              to="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
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
// Split into two parts:
// - NewTripDialog: includes the DialogTrigger (used on desktop in the nav)
// - NewTripDialogContent: just the inner content (used by the FAB-controlled Dialog on mobile)

function NewTripDialogContent({
  open,
  onOpenChange,
  prefillPrompt,
  onPrefillConsumed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefillPrompt?: string | null;
  onPrefillConsumed?: () => void;
}) {
  const [tab, setTab] = useState("ai");
  const [prompt, setPrompt] = useState("");
  const [days, setDays] = useState<number | "">(2);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [focus, setFocus] = useState<FocusValue>("mix");
  const [pace, setPace] = useState<PaceValue>("balanced");
  const [budget, setBudget] = useState<BudgetValue>("moderate");
  const [accommodation, setAccommodation] = useState("");
  // Set when the user cancels a generation (or closes the dialog) mid-flight,
  // so a late-arriving result is discarded instead of saved.
  const cancelledRef = useRef(false);

  // Pre-fill prompt from hero/quick-create (consumed once)
  useEffect(() => {
    if (prefillPrompt && open) {
      setPrompt(prefillPrompt);
      onPrefillConsumed?.();
    }
  }, [prefillPrompt, open]);

  // Closing the dialog mid-generation counts as a cancellation.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Rotate the loading message every 3s while generating so it feels alive.
  const LOADING_MESSAGES = [
    "Dreaming up your itinerary…",
    "Finding the best spots…",
    "Checking the map…",
    "Adding those finishing touches…",
  ];
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [loading]);
  const navigate = useNavigate();
  const aiFn = useServerFn(generateItinerary);
  const mapsKey = useGoogleMapsKey();

  const reset = useCallback(() => {
    setPrompt("");
    setDays(2);
    setTitle("");
    setDestination("");
    setLoading(false);
    setLoadingMsgIdx(0);
    setFocus("mix");
    setPace("balanced");
    setBudget("moderate");
    setAccommodation("");
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
    const paceSnippet = PACE_OPTIONS.find((p) => p.value === pace)?.prompt ?? "";
    const budgetSnippet = BUDGET_OPTIONS.find((b) => b.value === budget)?.prompt ?? "";
    const accommodationLine = accommodation.trim()
      ? `\n\nAccommodation: The traveler is staying at "${accommodation.trim()}".`
      : "";
    const enrichedPrompt = `${prompt.trim()}\n\nFocus preference: ${focusSnippet}\n\nPace preference: ${paceSnippet}\n\nBudget preference: ${budgetSnippet}${accommodationLine}`;
    setLoading(true);
    setLoadingMsgIdx(0);
    cancelledRef.current = false;
    // Don't auto-logout mid-generation.
    deferAutoLogout();
    try {
      const res = await aiFn({ data: { prompt: enrichedPrompt, days: numDays, token } });
      if (cancelledRef.current) {
        // User cancelled (or closed the dialog) mid-generation: discard the
        // result. Inputs are left intact so they can fix the mistake.
        return;
      }
      const trip: Trip = {
        id: newId(),
        title: res.title,
        destination: res.destination,
        countryCode: res.countryCode,
        promptText: prompt.trim(),
        focus,
        pace,
        budget,
        accommodation: accommodation.trim() || undefined,
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
      // Resolve Google place_ids for photo thumbnails (best-effort; the trip
      // is already saved, so photo failures never break generation).
      if (mapsKey) {
        try {
          const enriched = await enrichTripWithPlaceIds(trip, mapsKey);
          await saveTrip(enriched);
          // Geocode the accommodation for the map pin (best-effort).
          if (accommodation.trim() && enriched.days.length > 0) {
            const firstStop = enriched.days[0].stops[0];
            if (firstStop) {
              const coords = await geocodeAccommodation(
                accommodation.trim(),
                firstStop.lat,
                firstStop.lng,
                mapsKey
              );
              if (coords) {
                await saveTrip({
                  ...enriched,
                  accommodationLat: coords.lat,
                  accommodationLng: coords.lng,
                });
              }
            }
          }
        } catch {
          // ignore — photos are best-effort
        }
      }
      onOpenChange(false);
      reset();
      navigate({ to: "/trip/$tripId", params: { tripId: trip.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate itinerary");
      setLoading(false);
    } finally {
      resumeAutoLogout();
    }
  };

  const handleCancelGeneration = () => {
    cancelledRef.current = true;
    setLoading(false);
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-lg font-medium">Generating your itinerary…</p>
              <p
                key={loadingMsgIdx}
                className="mt-1 animate-in fade-in text-sm text-muted-foreground"
              >
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
              <p className="mt-4 max-w-xs text-xs text-muted-foreground">
                This usually takes 20–40 seconds. You can cancel anytime.
              </p>
            </div>
          ) : (
            <>
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
            <Label>Pace</Label>
            <div className="flex flex-wrap gap-2 sm:justify-center">
              {PACE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPace(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
                    pace === option.value
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
            <Label>Budget</Label>
            <div className="flex flex-wrap gap-2 sm:justify-center">
              {BUDGET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBudget(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
                    budget === option.value
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
            <Label htmlFor="accommodation">Where are you staying? (optional)</Label>
            <Input
              id="accommodation"
              placeholder="e.g. Marriott Marquis San Francisco"
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll plan around your location and show it on the map.
            </p>
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
            </>
          )}
          <DialogFooter>
            {loading ? (
              <Button variant="outline" onClick={handleCancelGeneration}>
                Cancel
              </Button>
            ) : (
              <Button onClick={handleAi}>Generate itinerary</Button>
            )}
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
  );
}

function NewTripDialog({
  open,
  onOpenChange,
  prefillPrompt,
  onPrefillConsumed,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefillPrompt?: string | null;
  onPrefillConsumed?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="mr-1 h-4 w-4" /> New trip
        </Button>
      </DialogTrigger>
      <NewTripDialogContent
        open={open}
        onOpenChange={onOpenChange}
        prefillPrompt={prefillPrompt}
        onPrefillConsumed={onPrefillConsumed}
      />
    </Dialog>
  );
}