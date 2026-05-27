import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";
import { useTrips } from "@/lib/storage";
import { getTheme, setTheme, nextTheme, type Theme } from "@/lib/theme";
import { Sun, Moon, Monitor } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayName(user: SupabaseUser): string {
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "?"
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

// ── Theme toggle (reused from index) ─────────────────────────────────────────

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") return <Sun className="h-4 w-4" />;
  if (theme === "dark") return <Moon className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");
  useEffect(() => { setThemeState(getTheme()); }, []);
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
  const label = theme === "light" ? "Light mode" : theme === "dark" ? "Dark mode" : "System mode";
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

// ── Badge definitions ─────────────────────────────────────────────────────────

type Badge = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: (stats: { tripCount: number; countryCount: number; stopCount: number; foodStopCount: number; hasLongTrip: boolean }) => boolean;
};

const BADGES: Badge[] = [
  {
    id: "first_trip",
    emoji: "✈️",
    label: "First trip",
    description: "Plan your first trip",
    earned: ({ tripCount }) => tripCount >= 1,
  },
  {
    id: "world_traveller",
    emoji: "🌍",
    label: "World traveller",
    description: "Visit 5 countries",
    earned: ({ countryCount }) => countryCount >= 5,
  },
  {
    id: "globe_trotter",
    emoji: "🗺️",
    label: "Globe trotter",
    description: "Visit 10 countries",
    earned: ({ countryCount }) => countryCount >= 10,
  },
  {
    id: "foodie",
    emoji: "🍜",
    label: "Foodie",
    description: "Add 20 food stops",
    earned: ({ foodStopCount }) => foodStopCount >= 20,
  },
  {
    id: "long_haul",
    emoji: "🗓️",
    label: "Long haul",
    description: "Plan a 15-day trip",
    earned: ({ hasLongTrip }) => hasLongTrip,
  },
  {
    id: "explorer",
    emoji: "🧭",
    label: "Explorer",
    description: "Plan 10 trips",
    earned: ({ tripCount }) => tripCount >= 10,
  },
];

// ── Profile page ──────────────────────────────────────────────────────────────

function ProfilePage() {
  const user = useCurrentUser();
  const trips = useTrips();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Populate fields once user loads
  useEffect(() => {
    if (!user) return;
    setDisplayName(getDisplayName(user));
    setTravelStyle(user.user_metadata?.travel_style ?? "");
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      // Give auth a moment to resolve before redirecting
      const t = setTimeout(() => navigate({ to: "/login" }), 500);
      return () => clearTimeout(t);
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  // Derived stats
  const tripCount = trips.length;
  const countryCount = new Set(trips.map((t) => t.countryCode).filter(Boolean)).size;
  const stopCount = trips.reduce((n, t) => n + t.days.reduce((m, d) => m + d.stops.length, 0), 0);
  const foodStopCount = trips.reduce(
    (n, t) => n + t.days.reduce((m, d) => m + d.stops.filter((s) => s.category === "food").length, 0),
    0
  );
  const hasLongTrip = trips.some((t) => t.days.length >= 15);

  const stats = { tripCount, countryCount, stopCount, foodStopCount, hasLongTrip };

  // Member since
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          travel_style: travelStyle.trim(),
        },
      });
      if (error) throw error;
      toast.success("Profile saved");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const initials = displayName.slice(0, 1).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Breezy Plans</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Avatar + identity */}
        <div className="flex items-center gap-5 mb-10">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-medium text-primary ring-1 ring-primary/20">
              {initials}
            </div>
            {/* Camera — placeholder for future upload */}
            <div
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border cursor-not-allowed"
              title="Photo upload coming soon"
            >
              <Camera className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {memberSince && (
              <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Your travels
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: tripCount, label: "Trips planned" },
              { value: countryCount, label: "Countries" },
              { value: stopCount, label: "Stops explored" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-lg bg-muted/50 px-4 py-3 text-center"
              >
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Edit profile */}
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Profile
          </p>
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setDirty(true); }}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="travel-style">Travel style</Label>
              <Textarea
                id="travel-style"
                rows={3}
                value={travelStyle}
                onChange={(e) => { setTravelStyle(e.target.value); setDirty(true); }}
                placeholder="e.g. I love slow travel, street food, and getting lost in local neighbourhoods…"
              />
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Badges
          </p>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap gap-5">
              {BADGES.map((badge) => {
                const isEarned = badge.earned(stats);
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-2" title={badge.description}>
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-opacity ${
                        isEarned
                          ? "bg-primary/10 ring-1 ring-primary/20"
                          : "border border-dashed border-border opacity-40 grayscale"
                      }`}
                    >
                      {isEarned ? badge.emoji : "🔒"}
                    </div>
                    <span className="text-center text-xs text-muted-foreground leading-tight max-w-[64px]">
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">More badges coming soon.</p>
          </div>
        </section>

        {/* Account (read-only) */}
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Account
          </p>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm mt-0.5">{user.email}</p>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-xs text-muted-foreground">Password</p>
              <p className="text-sm mt-0.5 tracking-widest">••••••••</p>
            </div>
          </div>
        </section>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!user) return;
              setDisplayName(getDisplayName(user));
              setTravelStyle(user.user_metadata?.travel_style ?? "");
              setDirty(false);
            }}
            disabled={!dirty || saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

      </main>
    </div>
  );
}