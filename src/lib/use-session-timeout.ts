import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// ── Session idle timeout ──────────────────────────────────────────────────
// Logs the user out after 30 minutes of inactivity, with a 2-minute warning
// modal. Activity in any tab resets the clock (synced via localStorage).

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 2 * 60 * 1000; // show warning 2 minutes before logout
const HEARTBEAT_KEY = "breezyplans-last-activity";
const LOGOUT_REASON_KEY = "breezyplans-logout-reason";

export type LogoutReason = "inactivity" | null;

export function getLogoutReason(): LogoutReason {
  try {
    const r = sessionStorage.getItem(LOGOUT_REASON_KEY);
    sessionStorage.removeItem(LOGOUT_REASON_KEY);
    return r === "inactivity" ? "inactivity" : null;
  } catch {
    return null;
  }
}

function setLogoutReason(reason: "inactivity") {
  try {
    sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
  } catch {
    // ignore
  }
}

function touchActivity() {
  try {
    localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function readLastActivity(): number {
  try {
    return Number(localStorage.getItem(HEARTBEAT_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

export function useSessionTimeout(isAuthenticated: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);
  const warningTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);
  // When true, logout is deferred until the in-flight operation completes
  // (e.g. trip generation). Set via window event "breezyplans-defer-logout".
  const deferLogout = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimer.current) window.clearTimeout(warningTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
    if (countdownTimer.current) window.clearInterval(countdownTimer.current);
    warningTimer.current = logoutTimer.current = countdownTimer.current = null;
  }, []);

  const doLogout = useCallback(async () => {
    if (deferLogout.current) {
      // Retry shortly — the in-flight operation will clear the defer flag.
      logoutTimer.current = window.setTimeout(() => doLogout(), 5000);
      return;
    }
    clearTimers();
    setShowWarning(false);
    setLogoutReason("inactivity");
    await supabase.auth.signOut();
  }, [clearTimers]);

  const startWarning = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(WARNING_MS / 1000);
    countdownTimer.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    logoutTimer.current = window.setTimeout(() => doLogout(), WARNING_MS);
  }, [doLogout]);

  const resetClock = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    touchActivity();
    if (!isAuthenticated) return;
    const elapsed = Date.now() - readLastActivity();
    const untilWarning = Math.max(0, IDLE_TIMEOUT_MS - WARNING_MS - elapsed);
    warningTimer.current = window.setTimeout(startWarning, untilWarning);
  }, [clearTimers, isAuthenticated, startWarning]);

  const staySignedIn = useCallback(() => {
    resetClock();
  }, [resetClock]);

  // Track user activity.
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setShowWarning(false);
      return;
    }
    // Seed the clock on mount (covers fresh login).
    touchActivity();
    resetClock();

    const onActivity = () => {
      // Any activity dismisses the warning and restarts the clock.
      resetClock();
    };
    // Throttle mousemove — it's chatty.
    let lastMove = 0;
    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMove > 5000) {
        lastMove = now;
        onActivity();
      }
    };

    const handlers: Record<string, (e: Event) => void> = {};
    for (const evt of ACTIVITY_EVENTS) {
      const h = evt === "mousemove" ? onMouseMove : onActivity;
      handlers[evt] = h as (e: Event) => void;
      window.addEventListener(evt, h, { passive: true });
    }

    // Cross-tab sync: activity in another tab resets our clock too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === HEARTBEAT_KEY) resetClock();
    };
    window.addEventListener("storage", onStorage);

    // In-flight operations (trip generation) can defer the logout.
    const onDefer = () => {
      deferLogout.current = true;
    };
    const onUndefer = () => {
      deferLogout.current = false;
    };
    window.addEventListener("breezyplans-defer-logout", onDefer);
    window.addEventListener("breezyplans-resume-logout", onUndefer);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, handlers[evt]);
      }
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("breezyplans-defer-logout", onDefer);
      window.removeEventListener("breezyplans-resume-logout", onUndefer);
      clearTimers();
    };
  }, [isAuthenticated, clearTimers, resetClock]);

  return { showWarning, secondsLeft, staySignedIn, doLogout };
}

// Helpers for in-flight operations to defer the auto-logout.
export function deferAutoLogout() {
  window.dispatchEvent(new Event("breezyplans-defer-logout"));
}
export function resumeAutoLogout() {
  window.dispatchEvent(new Event("breezyplans-resume-logout"));
}
