import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Sparkles, Trash2, Calendar } from "lucide-react";
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
import type { User } from "@supabase/supabase-js";
import type { Trip } from "@/lib/types";

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
          <div className="flex items-center gap-3">
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
                <Link to="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
            <NewTripDialog />
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
          <EmptyState />
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
  const [days, setDays] = useState(2);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const aiFn = useServerFn(generateItinerary);

  const reset = () => {
    setPrompt("");
    setDays(2);
    setTitle("");
    setDestination("");
    setLoading(false);
  };

  const handleAi = async () => {
    if (!prompt.trim()) {
      toast.error("Add a quick prompt to start.");
      return;
    }
    setLoading(true);
    try {
      const res = await aiFn({ data: { prompt: prompt.trim(), days } });
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
    const trip: Trip = {
      id: newId(),
      title: title.trim(),
      destination: destination.trim(),
      days: Array.from({ length: days }, (_, i) => ({
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
      <DialogContent className="sm:max-w-lg">
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
              <Label htmlFor="days-ai">Days</Label>
              <Input
                id="days-ai"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
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
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
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
