/**
 * DemoCta
 *
 * Floating CTA for unauthenticated homepage visitors.
 *
 * Mobile  → fixed pill pinned to the bottom of the viewport, rendered via a
 *           React portal so it escapes any scroll container.
 * Desktop → sticky bar anchored to the bottom of the demo section wrapper.
 *           Uses `position: sticky; bottom: 0` — no JS needed.
 *
 * Usage: render <DemoCta /> once, as a sibling to <DemoTrip /> inside the
 * unauthenticated homepage section. The component handles its own
 * mobile/desktop split via Tailwind responsive prefixes.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// ── Mobile floating pill (portal) ────────────────────────────────────────────

function MobileFloatingCta() {
  const portalRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Render into document.body so `position: fixed` is relative to the
    // viewport, not any transformed/scrollable ancestor.
    portalRoot.current = document.body;
  }, []);

  if (typeof document === "undefined") return null; // SSR guard

  const pill = (
    <div
      className="
        fixed bottom-5 left-4 right-4 z-50
        flex items-center justify-between gap-3
        rounded-2xl border border-border/60
        bg-background/80 backdrop-blur-md
        px-4 py-3 shadow-lg
        md:hidden
      "
      role="complementary"
      aria-label="Sign up prompt"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">Like what you see?</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          Plan your own trip — free, takes 30 seconds.
        </p>
      </div>
      <Link to="/signup" className="shrink-0">
        <Button size="sm" className="gap-1.5">
          Get started
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );

  // portalRoot is set after mount; during SSR just return null
  return portalRoot.current ? createPortal(pill, portalRoot.current) : null;
}

// ── Desktop sticky bar ────────────────────────────────────────────────────────

function DesktopStickyBar() {
  return (
    <div
      className="
        hidden md:flex
        sticky bottom-0 z-10
        items-center justify-between gap-4
        border-t bg-background/90 backdrop-blur-sm
        px-6 py-4
        -mx-6           /* bleed to match parent padding */
      "
      role="complementary"
      aria-label="Sign up prompt"
    >
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Impressed?</span>{" "}
        Itineraries like this take about 10 seconds to generate.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link to="/login">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
        <Link to="/signup">
          <Button size="sm" className="gap-1.5">
            Sign up free
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DemoCta() {
  return (
    <>
      <MobileFloatingCta />
      <DesktopStickyBar />
    </>
  );
}