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
}

export function MapPanel({ stops, activeStopId, onSelect }: Props) {
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
      <FitBounds stops={stops} />
      {stops.map((s, i) => (
        <AdvancedMarker
          key={s.id}
          position={{ lat: s.lat, lng: s.lng }}
          onClick={() => onSelect?.(s.id)}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow ${
              activeStopId === s.id
                ? "border-primary bg-primary text-primary-foreground scale-110"
                : "border-foreground bg-foreground text-background"
            }`}
          >
            {i + 1}
          </div>
        </AdvancedMarker>
      ))}
    </Map>
  );
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const last = useRef<string>("");
  useEffect(() => {
    if (!map || !coreLib || stops.length === 0) return;
    const sig = stops.map((s) => `${s.lat},${s.lng}`).join("|");
    if (sig === last.current) return;
    last.current = sig;
    const bounds = new coreLib.LatLngBounds();
    stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
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
