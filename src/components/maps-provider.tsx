import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { APIProvider } from "@vis.gl/react-google-maps";
import { getMapsApiKey } from "@/lib/itinerary.functions";
import { supabase } from "@/lib/supabase";

let cachedKey: string | null = null;
let pending: Promise<string> | null = null;

function loadKey(fn: () => Promise<{ key: string }>) {
  // Only use cache if we previously got a real key back
  if (cachedKey) return Promise.resolve(cachedKey);
  // Don't reuse a pending promise from a previous failed attempt
  if (!pending) {
    pending = fn().then((r) => {
      if (r.key) cachedKey = r.key;
      else pending = null; // allow retry next time if key was empty
      return r.key;
    }).catch(() => {
      pending = null; // allow retry on error too
      return "";
    });
  }
  return pending;
}

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const fn = useServerFn(getMapsApiKey);
  const [key, setKey] = useState<string | null>(cachedKey);

  useEffect(() => {
    // Get the current session token and inject it into the server fn call
    // so requireAuth() on the server can validate the request.
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) { setKey(""); return; }
      // Temporarily patch fetch to inject Authorization header for this call
      const origFetch = window.fetch;
      window.fetch = (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return origFetch(input, { ...init, headers });
      };
      loadKey(fn).then(setKey).catch(() => setKey("")).finally(() => {
        window.fetch = origFetch;
      });
    });
  }, [fn]);

  if (key === null) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>;
  }
  if (!key) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Google Maps API key missing. Add GOOGLE_MAPS_API_KEY in project settings.
      </div>
    );
  }

  return (
    <APIProvider apiKey={key} libraries={["places", "marker"]}>
      {children}
    </APIProvider>
  );
}