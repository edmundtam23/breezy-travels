import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  AdvancedMarker,
  ControlPosition,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { Stop } from "@/lib/types";

interface Props {
  stops: Stop[];
  activeStopId?: string | null;
  onSelect?: (id: string) => void;
  accommodation?: { lat: number; lng: number; name: string } | null;
}

export function MapPanel({ stops, activeStopId, onSelect, accommodation }: Props) {
  const center = useMemo(() => {
    if (stops.length === 0) return { lat: 37.7749, lng: -122.4194 };
    const lat = stops.reduce((s, x) => s + x.lat, 0) / stops.length;
    const lng = stops.reduce((s, x) => s + x.lng, 0) / stops.length;
    return { lat, lng };
  }, [stops]);

  return (
    <Map
      mapId="itinerary-map"
      defaultCenter={center}
      defaultZoom={12}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      zoomControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
      streetViewControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
      fullscreenControlOptions={{ position: ControlPosition.RIGHT_TOP }}
      className="h-full w-full"
    >
      <FitBounds stops={stops} accommodation={accommodation} />
      {stops.map((s, i) => (
        <AdvancedMarker
          key={s.id}
          position={{ lat: s.lat, lng: s.lng }}
          onClick={() => onSelect?.(s.id)}
          // Active marker renders above overlapping markers.
          zIndex={activeStopId === s.id ? 1000 : undefined}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow ${
              activeStopId === s.id
                ? "border-primary bg-primary text-primary-foreground scale-110 ring-2 ring-white ring-offset-2 ring-offset-transparent"
                // Fixed black/white (not theme-aware): the map tiles don't change
                // in dark mode, so markers shouldn't invert either.
                : "border-neutral-900 bg-neutral-900 text-white"
            }`}
          >
            {i + 1}
          </div>
        </AdvancedMarker>
      ))}
      {accommodation && (
        <AdvancedMarker
          position={{ lat: accommodation.lat, lng: accommodation.lng }}
          title={`Staying at ${accommodation.name}`}
        >
          <div
            className="flex h-[41px] w-[41px] items-center justify-center rounded-full border border-neutral-300 bg-white shadow-lg"
            title={`Staying at ${accommodation.name}`}
          >
            <img
              src="data:image/png;base64,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"
              alt="Accommodation"
              className="h-6 w-6"
              draggable={false}
            />
          </div>
        </AdvancedMarker>
      )}
    </Map>
  );
}

function FitBounds({
  stops,
  accommodation,
}: {
  stops: Stop[];
  accommodation?: { lat: number; lng: number; name: string } | null;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const last = useRef<string>("");
  useEffect(() => {
    if (!map || !coreLib || stops.length === 0) return;
    const sig =
      stops.map((s) => `${s.lat},${s.lng}`).join("|") +
      (accommodation ? `|${accommodation.lat},${accommodation.lng}` : "");
    if (sig === last.current) return;
    last.current = sig;
    const bounds = new coreLib.LatLngBounds();
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    if (accommodation) {
      bounds.extend({ lat: accommodation.lat, lng: accommodation.lng });
    }
    if (stops.length === 1) {
      map.setCenter({ lat: stops[0].lat, lng: stops[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 80);
    }
  }, [map, coreLib, stops]);
  return null;
}

interface SearchProps {
  destinationHint?: string;
  onPick: (place: {
    name: string;
    placeId: string;
    lat: number;
    lng: number;
    address?: string;
    rating?: number;
    reviewCount?: number;
    photoUrl?: string;
  }) => void;
}

export function PlaceSearchInput({ destinationHint, onPick }: SearchProps) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["name", "place_id", "geometry", "formatted_address", "rating", "user_ratings_total", "photos"],
    });
    setReady(true);
    const listener = ac.addListener("place_changed", () => {
      const p = ac.getPlace();
      const loc = p.geometry?.location;
      if (!p.place_id || !loc) return;
      onPick({
        name: p.name ?? "",
        placeId: p.place_id,
        lat: loc.lat(),
        lng: loc.lng(),
        address: p.formatted_address ?? undefined,
        rating: p.rating ?? undefined,
        reviewCount: p.user_ratings_total ?? undefined,
        photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 200 }) ?? undefined,
      });
      if (inputRef.current) inputRef.current.value = "";
    });
    return () => listener.remove();
  }, [places, onPick]);

  return (
    <input
      ref={inputRef}
      placeholder={ready ? `Add a stop${destinationHint ? ` in ${destinationHint}` : ""}…` : "Loading places…"}
      disabled={!ready}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
