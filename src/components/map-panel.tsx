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
