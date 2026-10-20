import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Allowed origins for CSRF protection.
// Requests whose Origin header doesn't match are rejected before SSR runs.
const ALLOWED_ORIGINS = new Set([
  "https://breezy-travels.edmund-tam23.workers.dev",
]);

// Preview deployments of this worker get versioned URLs like
// https://<version>-breezy-travels.edmund-tam23.workers.dev. Only the owner
// of this Cloudflare account can mint hostnames under it, so trusting the
// pattern is as safe as trusting the exact production origin.
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith("-breezy-travels.edmund-tam23.workers.dev")
    );
  } catch {
    return false;
  }
}

// Security headers added to every response.
// CSP notes:
// - 'unsafe-eval' removed from script-src (was not needed).
// - 'unsafe-inline' kept in script-src: TanStack Start injects inline scripts
//   for SSR state dehydration. The hash-based approach described previously
//   was never implemented (likely lost in a Lovable overwrite). To harden
//   further, capture the SHA-256 hashes from CSP violation reports and
//   replace 'unsafe-inline' with those specific hashes.
// - 'unsafe-inline' kept in style-src: removing it breaks CSS-in-JS and
//   component libraries (shadcn/ui) and styles cannot execute code anyway.
// - wss://*.supabase.co added to connect-src for Supabase Realtime.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com https://*.ggpht.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://maps.googleapis.com https://places.googleapis.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
};

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Paths that should be rate limited (AI + auth server functions).
const RATE_LIMITED_PATHS = ["/_server"];

type Env = {
  RATE_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
};

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // CSRF protection: reject cross-origin POST requests whose Origin
      // doesn't match our allowed list. GET/HEAD are safe methods and exempt.
      const method = request.method.toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        const origin = request.headers.get("origin");
        if (origin && !isAllowedOrigin(origin)) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      // Rate limiting: apply to server function routes (/_server) using
      // the Cloudflare Rate Limiter binding. Keys by IP address so limits
      // are per-user rather than global.
      const { pathname } = new URL(request.url);
      const rateLimiter = (env as Env).RATE_LIMITER;
      if (rateLimiter && RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p))) {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const { success } = await rateLimiter.limit({ key: ip });
        if (!success) {
          return new Response("Too many requests. Please slow down and try again shortly.", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }
      }

      // Expose Cloudflare Worker env bindings (secrets/vars) to server functions.
      // In Workers, env is passed per-request and is NOT on process.env or globalThis by default.
      (globalThis as unknown as { __env?: unknown }).__env = env;

      // NOTE: We intentionally do NOT spread individual env values onto globalThis
      // to avoid leaking secrets (e.g. GEMINI_API_KEY) into the global scope.
      // Server functions should read from globalThis.__env via readEnv() instead.

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return addSecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};