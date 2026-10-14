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
          <img
            src="data:image/png;base64,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"
            alt="Accommodation"
            title={`Staying at ${accommodation.name}`}
            className="h-[45px] w-[37px] drop-shadow-lg"
            draggable={false}
          />
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
