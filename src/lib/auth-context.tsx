import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: SupabaseUser | null;
};

// Starts in "loading" so pages render a neutral skeleton — never the
// logged-out UI — until the persisted session has been checked. This kills the
// flash of the unauthenticated homepage when navigating while logged in.
const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  user: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    const applySession = (nextUser: SupabaseUser | null) => {
      if (cancelled) return;
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    };
    // getSession() reads the persisted session locally (no network round-trip),
    // so the initial state resolves fast. onAuthStateChange keeps it fresh and
    // fires INITIAL_SESSION immediately as well.
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session?.user ?? null);
      }
    );
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ status, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
