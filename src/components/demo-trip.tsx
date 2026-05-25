/**
 * DemoTrip
 *
 * A static, read-only trip card shown on the homepage to unauthenticated
 * users. Mirrors the real trip-detail UI so visitors immediately understand
 * what Breezy Plans produces.
 *
 * Changes from v1:
 *  - "Live demo" badge replaced with plain muted label text
 *  - Stop thumbnails now show category icons instead of a generic MapPin
 *  - Map panel uses a pre-generated static image (public/demo-map.png)
 *    instead of the fake SVG grid
 */

import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Bus,
  GripVertical,
  Lightbulb,
  UtensilsCrossed,
  Landmark,
  Trees,
  Palette,
  MapPin,
} from "lucide-react";

// ── Static trip data ──────────────────────────────────────────────────────────

// Category → lucide icon mapping. Mirrors the categories Gemini returns so
// the real trip cards can adopt this pattern too when photo loading is added.
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food: UtensilsCrossed,
  restaurant: UtensilsCrossed,
  "food market": UtensilsCrossed,
  "street food": UtensilsCrossed,
  sightseeing: Landmark,
  landmark: Landmark,
  museum: Landmark,
  outdoors: Trees,
  nature: Trees,
  culture: Palette,
  art: Palette,
};

function getCategoryIcon(tags: string[]): React.ElementType {
  const needle = tags.join(" ").toLowerCase();
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (needle.includes(key)) return Icon;
  }
  return MapPin;
}

const DEMO_DAY = {
  label: "Day 1",
  title: "Feast through Seoul's culinary hotspots",
  summary:
    "Traditional markets, Michelin-recommended restaurants, and street food bites.",
  stops: [
    {
      id: 1,
      time: "9:30 AM",
      durationMin: 120,
      name: "Gwangjang Market (광장시장)",
      tags: ["Food Market", "Street Food", "Traditional Korean"],
      blurb:
        "Start your day at one of Seoul's oldest and largest traditional markets.",
      tip: "Come hungry and be prepared for bustling crowds — arriving earlier offers a slightly less crowded experience.",
      transit: { label: "Subway line 1", durationMin: 22 },
    },
    {
      id: 2,
      time: "12:30 PM",
      durationMin: 75,
      name: "Myeongdong Kyoja (명동교자)",
      tags: ["Restaurant", "Traditional Korean"],
      blurb:
        "Enjoy a hearty lunch at this Michelin Bib Gourmand restaurant, famous for its hand-cut noodles.",
      tip: "Long queues are common during peak lunch hours — try to arrive just before noon or after 1:30 PM to avoid the longest waits.",
      transit: null,
    },
  ],
};

// ── StopCard ──────────────────────────────────────────────────────────────────

function StopCard({
  stop,
  index,
  isLast,
}: {
  stop: (typeof DEMO_DAY.stops)[number];
  index: number;
  isLast: boolean;
}) {
  const CategoryIcon = getCategoryIcon(stop.tags);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Main row */}
      <div className="flex gap-3 p-4">
        {/* Drag handle — visual only in demo */}
        <div className="flex items-center text-muted-foreground/30 cursor-default select-none">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Category icon thumbnail — intentional placeholder, not a broken image */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CategoryIcon className="h-5 w-5 text-muted-foreground/50" />
          <span
            className={`absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold ${
              index === 0
                ? "bg-orange-500 text-white"
                : "bg-foreground text-background"
            }`}
          >
            {index + 1}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{stop.time}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{stop.durationMin}m</span>
          </div>
          <p className="font-semibold leading-snug">{stop.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            · {stop.tags.join(", ")}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {stop.blurb}
          </p>
        </div>
      </div>

      {/* Tip box */}
      <div className="mx-4 mb-3 flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/40">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          {stop.tip}
        </p>
      </div>

      {/* Transit row */}
      {!isLast && (
        <div className="flex items-center gap-2 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <Bus className="h-3.5 w-3.5" />
          <span>Transit to next</span>
          {stop.transit && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[11px]">
              <Clock className="h-3 w-3" />
              {stop.transit.durationMin} min
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Map panel (desktop only) ──────────────────────────────────────────────────

function DemoMapPanel() {
  return (
    <div className="hidden md:flex flex-col rounded-xl border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Map view
        </span>
      </div>

      <div className="relative flex-1 min-h-[320px] overflow-hidden">
        {/* Static pre-generated map — save public/demo-map.png from the
            Maps Static API URL in the handoff doc, then commit it.        */}
        <img
          src="/demo-map.png"
          alt="Map showing the Seoul foodie itinerary stops"
          className="absolute inset-0 h-full w-full object-cover object-center"
          // No onError handler needed — if the file is missing during dev,
          // the browser shows a broken-image icon only in the map panel,
          // which is clearly a dev-environment issue, not a product bug.
        />

        {/* Gradient + CTA overlay pinned to the bottom */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-background/95 via-background/60 to-transparent pb-8 pt-20">
          <p className="text-sm text-muted-foreground">
            Sign up to explore stops on a live map
          </p>
          <Link to="/signup">
            <Button size="sm" variant="outline">
              Get started free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DemoTrip() {
  return (
    <div className="w-full">
      {/* Day header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {DEMO_DAY.label}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">
            {DEMO_DAY.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{DEMO_DAY.summary}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 mt-0.5">
          AI generated
        </Badge>
      </div>

      {/* Stop cards */}
      <div className="flex flex-col gap-3">
        {DEMO_DAY.stops.map((stop, i) => (
          <StopCard
            key={stop.id}
            stop={stop}
            index={i}
            isLast={i === DEMO_DAY.stops.length - 1}
          />
        ))}
      </div>

      {/* "More stops" hint */}
      <p className="mt-3 text-center text-xs text-muted-foreground/60">
        ··· 3 more stops on this day
      </p>
    </div>
  );
}

// Named export so index.tsx can import the map panel separately and place it
// in the right column of the desktop grid without restructuring DemoTrip.
export { DemoMapPanel };