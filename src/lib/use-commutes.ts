import { useEffect, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { Stop, TravelMode } from "@/lib/types";

export interface CommuteResult {
  travelMin: number;
  distanceText: string;
  durationText: string;
  status: "ok" | "tight" | "late" | "unknown";
  gapMin: number;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function useCommutes(stops: Stop[]): Record<string, CommuteResult> {
  const routes = useMapsLibrary("routes");
  const [results, setResults] = useState<Record<string, CommuteResult>>({});

  useEffect(() => {
    if (!routes || stops.length < 2) {
      setResults({});
      return;
    }
    const svc = new routes.DirectionsService();
    let cancelled = false;

    const run = async () => {
      const next: Record<string, CommuteResult> = {};
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        const mode = a.travelModeToNext as TravelMode;
        try {
          const res = await svc.route({
            origin: { lat: a.lat, lng: a.lng },
            destination: { lat: b.lat, lng: b.lng },
            travelMode: mode as unknown as never,
          });
          const leg = res.routes[0]?.legs[0];
          if (!leg?.duration) continue;
          const travelMin = Math.ceil(leg.duration.value / 60);
          const gapMin = timeToMinutes(b.time) - (timeToMinutes(a.time) + a.durationMin);
          let status: CommuteResult["status"] = "ok";
          if (gapMin < travelMin) status = "late";
          else if (gapMin < travelMin + 10) status = "tight";
          next[b.id] = {
            travelMin,
            distanceText: leg.distance?.text ?? "",
            durationText: leg.duration.text ?? `${travelMin} min`,
            status,
            gapMin,
          };
        } catch {
          // skip
        }
      }
      if (!cancelled) setResults(next);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [routes, stops]);

  return results;
}
