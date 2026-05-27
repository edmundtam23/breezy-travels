// src/components/destination-hero.tsx
//
// Amber banner shown above the demo itinerary on the unauthenticated homepage.
// Replaces the "Create an account" banner on mobile (which is hidden md:block).
// Communicates destination context and carries the "sign up to generate your
// own" conversion nudge inline.
//
// This component is static — it always shows the Seoul demo content.
// If the demo trip destination changes, update the flag, name, and link here.

import { Link } from "@tanstack/react-router";

export function DestinationHero() {
  return (
    <div
      className={[
        "rounded-xl px-3.5 py-3 mb-3.5",
        "flex items-center justify-between gap-3",
        "bg-blue-50 border border-blue-200",
        "dark:bg-blue-950 dark:border-blue-900",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[22px] shrink-0" aria-hidden="true">🇰🇷</span>
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-blue-900 dark:text-blue-300 truncate">
            Seoul, South Korea
          </p>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-px">
            Sample itinerary ·{" "}
            <Link
              to="/signup"
              className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-300"
            >
              sign up to generate your own
            </Link>
          </p>
        </div>
      </div>

      <span
        className={[
          "shrink-0 text-[10px] font-medium px-2 py-1 rounded-full whitespace-nowrap",
          "bg-[#1e3a8a] text-[#dbeafe]",
        ].join(" ")}
      >
        AI generated
      </span>
    </div>
  );
}