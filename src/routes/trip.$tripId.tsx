import { StopPhoto } from "@/components/stop-photo";
import {
  enrichTripWithPlaceIds,
  useGoogleMapsKey,
} from "@/lib/place-photos";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  Bus,
  Car,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Footprints,
  GripVertical,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  PopoverClose,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useTrips, useUpdateTrip, newId, saveTrip } from "@/lib/storage";
import type { Stop, TravelMode, Trip, Day } from "@/lib/types";
import { MapPanel, PlaceSearchInput } from "@/components/map-panel";
import { MapsProvider } from "@/components/maps-provider";
import { useCommutes, type CommuteResult } from "@/lib/use-commutes";
import { generateBlurb, generateItinerary } from "@/lib/itinerary.functions";
import { FOCUS_OPTIONS, type FocusValue } from "@/lib/focus-options";
import { downloadTripHtml } from "@/lib/export-trip-html";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/trip/$tripId")({
  component: TripBuilder,
});

function TripBuilder() {
  const { tripId } = Route.useParams();
  const trips = useTrips();
  const trip = trips?.find((t) => t.id === tripId);
  const update = useUpdateTrip(tripId);
  const navigate = useNavigate();
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  // Single collapsed state controls both map and day header on mobile
  const [collapsed, setCollapsed] = useState(false);

  if (trips === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading trip…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Trip not found.</p>
          <Button variant="link" onClick={() => navigate({ to: "/" })}>
            Back home
          </Button>
        </div>
      </div>
    );
  }

  const safeDayIdx = Math.min(activeDayIdx, trip.days.length - 1);
  const day = trip.days[safeDayIdx];

  return (
    <MapsProvider>
      <div className="flex h-screen flex-col bg-background">
        <Toaster />
        <Header trip={trip} update={update} />
        <div className="grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[1fr_440px]">
          {/* Map — collapses on mobile when collapsed=true */}
          <div
            className={`relative transition-all duration-300 md:min-h-0 ${
              collapsed ? "min-h-0 h-0 overflow-hidden" : "min-h-[30vh]"
            }`}
          >
            <MapPanel
              stops={day?.stops ?? []}
              activeStopId={activeStopId}
              onSelect={setActiveStopId}
            />
            {trip.days.length > 1 && (
              <div className="absolute left-4 top-4 z-10">
                <Tabs
                  value={String(safeDayIdx)}
                  onValueChange={(v) => setActiveDayIdx(Number(v))}
                >
                  <TabsList className="bg-background/95 shadow-md backdrop-blur flex-nowrap overflow-x-auto max-w-[calc(100vw-2rem)]">
                    {trip.days.map((d, i) => (
                      <TabsTrigger key={d.id} value={String(i)}>
                        Day {i + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
          <Sidebar
            trip={trip}
            day={day}
            dayIdx={safeDayIdx}
            update={update}
            activeStopId={activeStopId}
            setActiveStopId={setActiveStopId}
            collapsed={collapsed}
            onToggle={(val) => setCollapsed(val)}
          />
        </div>
      </div>
    </MapsProvider>
  );
}

function Header({ trip, update }: { trip: Trip; update: ReturnType<typeof useUpdateTrip> }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  useEffect(() => setTitle(trip.title), [trip.title]);
  return (
    <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 md:py-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="rounded p-1 hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              update((t) => ({ ...t, title: title.trim() || t.title }));
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="rounded border bg-background px-2 py-1 text-base font-semibold"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left text-base font-semibold hover:underline truncate max-w-[calc(100vw-80px)]"
          >
            {trip.title}
          </button>
        )}
        <span className="hidden text-sm text-muted-foreground md:inline">· {trip.destination}</span>
      </div>
      <div className="flex items-center gap-1">
        <ShareTripDialog trip={trip} />
        <EditTripDetailsDialog trip={trip} />
      </div>
    </header>
  );
}

function ShareTripDialog({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  // undefined = not checked yet, null = no link, string = active token
  const [shareToken, setShareToken] = useState<string | null | undefined>(undefined);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadShare = async () => {
    setShareToken(undefined);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setShareToken(null);
      return;
    }
    const { data } = await supabase
      .from("trip_shares")
      .select("token")
      .eq("trip_id", trip.id)
      .maybeSingle();
    setShareToken(data?.token ?? null);
  };

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setCopied(false);
      loadShare();
    }
    setOpen(o);
  };

  const handleCreate = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to share this trip.");
      return;
    }
    setWorking(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await supabase.from("trip_shares").insert({
        token,
        trip_id: trip.id,
        created_by: user.id,
      });
      if (error) throw error;
      setShareToken(token);
    } catch {
      toast.error("Couldn't create the share link.");
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    if (!shareToken) return;
    setWorking(true);
    try {
      const { error } = await supabase.from("trip_shares").delete().eq("token", shareToken);
      if (error) throw error;
      setShareToken(null);
      toast.success("Share link disabled.");
    } catch {
      toast.error("Couldn't disable the share link.");
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Share trip">
          <Share2 className="h-4 w-4" />
          <span className="hidden md:inline">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share this trip</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this trip. Signed-in friends can save a copy to
            their own trips.
          </DialogDescription>
        </DialogHeader>
        {shareToken === undefined ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : shareToken === null ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              No share link yet. Create one to let friends view or copy this trip.
            </p>
            <Button className="mt-4" onClick={handleCreate} disabled={working}>
              {working ? "Creating…" : "Create share link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadTripHtml(trip)}>
                <Download className="mr-1 h-4 w-4" /> Download HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisable}
                disabled={working}
                className="text-destructive hover:text-destructive"
              >
                Disable link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The HTML download works offline and can be forwarded to anyone — no account
              needed.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditTripDetailsDialog({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [idea, setIdea] = useState(trip.promptText ?? "");
  const [focus, setFocus] = useState<FocusValue>(
    (FOCUS_OPTIONS.some((o) => o.value === trip.focus) ? trip.focus : "mix") as FocusValue
  );
  const [days, setDays] = useState<number | "">(trip.days.length);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const aiFn = useServerFn(generateItinerary);
  // Named distinctly from TripBuilder's mapsKey: duplicate variable names in
  // one module trigger a bundler renaming bug (declaration renamed, usage missed).
  const regenMapsKey = useGoogleMapsKey();

  // Rotate the loading message every 3s while regenerating.
  const REGEN_LOADING_MESSAGES = [
    "Dreaming up your new itinerary…",
    "Finding the best spots…",
    "Checking the map…",
    "Adding those finishing touches…",
  ];
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % REGEN_LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, [loading]);

  const handleOpenChange = (o: boolean) => {
    if (o) {
      // Refresh fields from the trip each time the dialog opens.
      setIdea(trip.promptText ?? "");
      setFocus(
        (FOCUS_OPTIONS.some((opt) => opt.value === trip.focus) ? trip.focus : "mix") as FocusValue
      );
      setDays(trip.days.length);
      setConfirming(false);
    }
    setOpen(o);
  };

  const handleRegenerate = async () => {
    if (!idea.trim()) {
      toast.error("Add a trip idea to regenerate.");
      return;
    }    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? "";
    if (!token) {
      toast.error("Please sign in to regenerate the itinerary.");
      return;
    }
    const numDays = Number(days) || 1;
    const focusSnippet = FOCUS_OPTIONS.find((f) => f.value === focus)?.prompt ?? "";
    const enrichedPrompt = `${idea.trim()}\n\nFocus preference: ${focusSnippet}`;
    setLoading(true);
    setLoadingMsgIdx(0);
    try {
      const res = await aiFn({ data: { prompt: enrichedPrompt, days: numDays, token } });
      const updated: Trip = {
        ...trip,
        title: res.title,
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
        promptText: idea.trim(),
        focus,
        updatedAt: new Date().toISOString(),
      };
      await saveTrip(updated);
      // Resolve Google place_ids for photo thumbnails (best-effort; the trip
      // is already saved, so photo failures never break regeneration).
      if (regenMapsKey) {
        try {
          const enriched = await enrichTripWithPlaceIds(updated, regenMapsKey);
          await saveTrip(enriched);
        } catch {
          // ignore — photos are best-effort
        }
      }
      setOpen(false);
      toast.success("Itinerary regenerated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate itinerary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Edit trip details">
          <Pencil className="h-4 w-4" />
          <span className="hidden md:inline">Edit details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Regenerating your itinerary…</p>
            <p
              key={loadingMsgIdx}
              className="mt-1 animate-in fade-in text-sm text-muted-foreground"
            >
              {REGEN_LOADING_MESSAGES[loadingMsgIdx]}
            </p>
            <p className="mt-4 max-w-xs text-xs text-muted-foreground">
              This usually takes 20–40 seconds.
            </p>
          </div>
        ) : !confirming ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit trip details</DialogTitle>
              <DialogDescription>
                Update the inputs that generated this trip, then regenerate the itinerary.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="edit-idea">Trip idea</Label>
                <Textarea
                  id="edit-idea"
                  rows={3}
                  placeholder="e.g. 2 days in San Francisco, foodie & murals focus"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                />
                {!trip.promptText && (
                  <p className="text-xs text-muted-foreground">
                    The original prompt wasn't saved for this trip — enter new details to regenerate.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Trip focus</Label>
                <div className="flex flex-wrap gap-2">
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
                <Label htmlFor="edit-days">Days</Label>
                <Input
                  id="edit-days"
                  type="number"
                  min={1}
                  max={14}
                  value={days}
                  onChange={(e) => {
                    let value: number | "" = e.target.value === "" ? "" : Number(e.target.value);
                    if (typeof value === "number" && value > 14) value = 14;
                    if (typeof value === "number" && value < 1) value = 1;
                    setDays(value);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfirming(true)} disabled={loading}>
                Regenerate itinerary
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Regenerate itinerary?</DialogTitle>
              <DialogDescription>
                This will replace your current day-by-day plan with a freshly generated one. Any
                manual edits to stops will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
                Keep current
              </Button>
              <Button onClick={handleRegenerate} disabled={loading}>
                {loading ? "Regenerating…" : "Yes, regenerate"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Sidebar({
  trip,
  day,
  dayIdx,
  update,
  activeStopId,
  setActiveStopId,
  collapsed,
  onToggle,
}: {
  trip: Trip;
  day: Day | undefined;
  dayIdx: number;
  update: ReturnType<typeof useUpdateTrip>;
  activeStopId: string | null;
  setActiveStopId: (id: string) => void;
  collapsed: boolean;
  onToggle: (val: boolean) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const commutes = useCommutes(day?.stops ?? []);

  // Track touch start Y for drag gesture on handle
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    // Drag up 80px+ collapses, drag down 80px+ expands
    if (deltaY > 80) onToggle(true);
    else if (deltaY < -80) onToggle(false);
    touchStartY.current = null;
  };

  if (!day) {
    return (
      <aside className="flex flex-col border-l p-6">
        <p className="text-sm text-muted-foreground">No days yet.</p>
        <Button
          className="mt-4"
          onClick={() =>
            update((t) => ({
              ...t,
              days: [...t.days, { id: newId(), title: `Day ${t.days.length + 1}`, summary: "", stops: [] }],
            }))
          }
        >
          Add a day
        </Button>
      </aside>
    );
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    update((t) => {
      const days = t.days.slice();
      const d = { ...days[dayIdx] };
      const oldIdx = d.stops.findIndex((s) => s.id === active.id);
      const newIdx = d.stops.findIndex((s) => s.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return t;
      d.stops = arrayMove(d.stops, oldIdx, newIdx);
      days[dayIdx] = d;
      return { ...t, days };
    });
  };

  const updateStop = (stopId: string, patch: Partial<Stop>) => {
    update((t) => {
      const days = t.days.slice();
      const d = { ...days[dayIdx] };
      d.stops = d.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s));
      days[dayIdx] = d;
      return { ...t, days };
    });
  };

  const removeStop = (stopId: string) => {
    update((t) => {
      const days = t.days.slice();
      const d = { ...days[dayIdx] };
      d.stops = d.stops.filter((s) => s.id !== stopId);
      days[dayIdx] = d;
      return { ...t, days };
    });
  };

  const addStop = (place: {
    name: string;
    placeId: string;
    lat: number;
    lng: number;
    address?: string;
    rating?: number;
    reviewCount?: number;
    photoUrl?: string;
  }) => {
    update((t) => {
      const days = t.days.slice();
      const d = { ...days[dayIdx] };
      const lastTime = d.stops[d.stops.length - 1]?.time ?? "08:30";
      const nextTime = addMinutes(lastTime, d.stops.length === 0 ? 30 : 90);
      d.stops = [
        ...d.stops,
        {
          id: newId(),
          placeId: place.placeId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          time: nextTime,
          durationMin: 60,
          blurb: "",
          rating: place.rating,
          reviewCount: place.reviewCount,
          photoUrl: place.photoUrl,
          travelModeToNext: "DRIVING",
        },
      ];
      days[dayIdx] = d;
      return { ...t, days };
    });
  };

  return (
    <aside className="flex min-h-0 flex-col border-l">

      {/* Day header — slides up and hides on mobile when collapsed */}
      <div
        className={`transition-all duration-300 overflow-hidden md:block ${
          collapsed ? "max-h-0" : "max-h-96"
        }`}
      >
        <div className="border-b p-5 overflow-hidden">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Day {dayIdx + 1}
          </div>
          <textarea
            value={day.title}
            rows={1}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            onChange={(e) => {
              const v = e.target.value;
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
              update((t) => {
                const days = t.days.slice();
                days[dayIdx] = { ...days[dayIdx], title: v };
                return { ...t, days };
              });
            }}
            className="mt-1 w-full resize-none bg-transparent text-2xl font-semibold tracking-tight focus:outline-none overflow-hidden md:overflow-x-auto md:whitespace-nowrap"
          />
          <textarea
            value={day.summary}
            placeholder="Add a short summary for this day…"
            rows={2}
            onChange={(e) => {
              const v = e.target.value;
              update((t) => {
                const days = t.days.slice();
                days[dayIdx] = { ...days[dayIdx], summary: v };
                return { ...t, days };
              });
            }}
            className="mt-2 w-full resize-none bg-transparent text-sm text-muted-foreground focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <a
              href={mapsRouteUrl(day.stops)}
              target="_blank"
              rel="noreferrer"
              aria-disabled={day.stops.length < 2}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" /> Open route
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(formatItineraryText(day));
                toast.success("Day copied to clipboard");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy
            </Button>
          </div>
        </div>
      </div>

      {/* Drag handle — only on mobile, between day header and stop cards.
          Drag up 80px to collapse map + header, drag down 80px to expand. */}
      <div
        className="md:hidden flex justify-center items-center py-3 cursor-grab active:cursor-grabbing active:bg-muted transition-colors touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {day.stops.map((s, i) => (
                <SortableStop
                  key={s.id}
                  stop={s}
                  index={i}
                  destination={trip.destination}
                  active={activeStopId === s.id}
                  onSelect={() => setActiveStopId(s.id)}
                  onChange={(patch) => updateStop(s.id, patch)}
                  onRemove={() => removeStop(s.id)}
                  commute={commutes[s.id]}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="mt-4 space-y-2 rounded-lg border border-dashed p-3">
          <Label className="text-xs text-muted-foreground">Add a stop</Label>
          <PlaceSearchInput destinationHint={trip.destination} onPick={addStop} />
        </div>
      </div>

      <div className="shrink-0 border-t p-3">
        <DayManager trip={trip} update={update} />
      </div>
    </aside>
  );
}

function SortableStop({
  stop,
  index,
  destination,
  active,
  onSelect,
  onChange,
  onRemove,
  commute,
}: {
  stop: Stop;
  index: number;
  destination: string;
  active: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Stop>) => void;
  onRemove: () => void;
  commute?: CommuteResult;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      {commute && commute.status !== "ok" && (
        <CommuteWarning commute={commute} mode={stop.travelModeToNext} />
      )}
      <div
        className={`group rounded-xl border bg-card p-3 shadow-sm transition ${
          active ? "ring-2 ring-primary" : ""
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
            aria-label="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Live Google Places photo when available; falls back to the
              category-emoji thumbnail (and while loading). place_id is resolved
              at generation time; photo names are never stored per ToS. */}
          <StopPhoto
            placeId={stop.placeId}
            name={stop.name}
            category={stop.category}
            index={index}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <TimeInput value={stop.time} onChange={(v) => onChange({ time: v })} />
              <span className="text-xs">· {stop.durationMin}m</span>
            </div>
            <div className="mt-0.5 truncate text-base font-semibold">{stop.name}</div>
            {(stop.rating || stop.category) && (
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {stop.rating && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> {stop.rating}
                    {stop.reviewCount ? ` (${stop.reviewCount.toLocaleString()})` : ""}
                  </span>
                )}
                {stop.category && <span>· {stop.category}</span>}
              </div>
            )}
            {stop.blurb && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{stop.blurb}</p>
            )}
            {stop.visitTip && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                <Lightbulb className="mt-px h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{stop.visitTip}</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <ModePicker
                mode={stop.travelModeToNext}
                onChange={(m) => onChange({ travelModeToNext: m })}
              />
              <div className="flex items-center gap-1">
                <EditPopover stop={stop} destination={destination} onChange={onChange} />
                <button
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  aria-label="Remove stop"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function CommuteWarning({ commute, mode }: { commute: CommuteResult; mode: TravelMode }) {
  const isLate = commute.status === "late";
  const colorClasses = isLate
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  const Icon = modeIcon(mode);
  return (
    <div className={`mb-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${colorClasses}`}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <div className="font-medium">
          {isLate ? "You may be late" : "Tight connection"}
        </div>
        <div className="opacity-90">
          <Icon className="mr-1 inline h-3 w-3" />
          {commute.durationText} {commute.distanceText && `· ${commute.distanceText}`} — only{" "}
          {Math.max(0, commute.gapMin)} min between stops.
        </div>
      </div>
    </div>
  );
}

function ModePicker({
  mode,
  onChange,
}: {
  mode: TravelMode;
  onChange: (m: TravelMode) => void;
}) {
  return (
    <Select value={mode} onValueChange={(v) => onChange(v as TravelMode)}>
      <SelectTrigger
        className="h-7 w-auto gap-1 border-none bg-transparent px-1 text-xs text-muted-foreground hover:bg-muted"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="WALKING">
          <span className="inline-flex items-center gap-2"><Footprints className="h-3 w-3" /> Walk to next</span>
        </SelectItem>
        <SelectItem value="DRIVING">
          <span className="inline-flex items-center gap-2"><Car className="h-3 w-3" /> Drive to next</span>
        </SelectItem>
        <SelectItem value="TRANSIT">
          <span className="inline-flex items-center gap-2"><Bus className="h-3 w-3" /> Transit to next</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function modeIcon(m: TravelMode) {
  if (m === "WALKING") return Footprints;
  if (m === "TRANSIT") return Bus;
  return Car;
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <TimePicker value={value} onChange={onChange} />;
}

function EditPopover({
  stop,
  destination,
  onChange,
}: {
  stop: Stop;
  destination: string;
  onChange: (p: Partial<Stop>) => void;
}) {
  const [blurb, setBlurb] = useState(stop.blurb);
  const [duration, setDuration] = useState(stop.durationMin);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const aiBlurb = useServerFn(generateBlurb);
  useEffect(() => setBlurb(stop.blurb), [stop.blurb]);
  useEffect(() => setDuration(stop.durationMin), [stop.durationMin]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Edit details"
          onClick={(e) => e.stopPropagation()}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Stay duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              max={600}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
              onBlur={() => onChange({ durationMin: Math.max(5, duration) })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Blurb</Label>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    // Pass token in data payload so requireAuth() can validate server-side.
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData.session?.access_token ?? "";
                    const r = await aiBlurb({ data: { name: stop.name, destination, token } });
                    setBlurb(r.blurb);
                    onChange({ blurb: r.blurb });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "AI failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Sparkles className="mr-1 h-3 w-3" /> {busy ? "…" : "AI"}
              </Button>
            </div>
            <Textarea
              rows={3}
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              onBlur={() => onChange({ blurb })}
            />
          </div>
          <PopoverClose asChild>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onChange({ blurb, durationMin: Math.max(5, duration) });
                toast.success("Saved");
              }}
            >
              <Check className="mr-1 h-3 w-3" /> Done
            </Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayManager({
  trip,
  update,
}: {
  trip: Trip;
  update: ReturnType<typeof useUpdateTrip>;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        {trip.days.length} {trip.days.length === 1 ? "day" : "days"}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            update((t) => ({
              ...t,
              days: [
                ...t.days,
                { id: newId(), title: `Day ${t.days.length + 1}`, summary: "", stops: [] },
              ],
            }))
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Add day
        </Button>
      </div>
    </div>
  );
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function mapsRouteUrl(stops: Stop[]): string {
  if (stops.length === 0) return "https://www.google.com/maps";
  if (stops.length === 1)
    return `https://www.google.com/maps/search/?api=1&query=${stops[0].lat},${stops[0].lng}`;
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops
    .slice(1, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: stops[0].travelModeToNext.toLowerCase(),
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatItineraryText(day: Day): string {
  const lines = [day.title, day.summary, ""];
  day.stops.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.time} — ${s.name}${s.address ? ` (${s.address})` : ""}`);
    if (s.blurb) lines.push(`   ${s.blurb}`);
  });
  return lines.join("\n");
}