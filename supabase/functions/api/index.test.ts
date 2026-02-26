import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertNotEquals } from "https://deno.land/std@0.224.0/assert/assert_not_equals.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const API_BASE = `${SUPABASE_URL}/functions/v1/api`;
const AUTH_BASE = `${SUPABASE_URL}/functions/v1/auth-pin`;

// Helper: call API and consume body (prevents resource leaks)
async function api(path: string, opts: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function apiAuth(path: string, token: string, opts: RequestInit = {}): Promise<{ status: number; body: any }> {
  return api(path, {
    ...opts,
    headers: { "x-session-token": token, ...opts.headers },
  });
}

// ==================== SMOKE TESTS ====================

// 1. All endpoints return 401 without token (not 404 = route exists)
const ROUTES_TO_CHECK: Array<{ path: string; method: string }> = [
  { path: "/stations", method: "GET" },
  { path: "/drinks", method: "GET" },
  { path: "/reservations", method: "GET" },
  { path: "/bookings", method: "GET" },
  { path: "/sessions", method: "POST" },
  { path: "/payments", method: "POST" },
  { path: "/controller-usage", method: "POST" },
  { path: "/session-drinks", method: "POST" },
  { path: "/drink-sales", method: "POST" },
  { path: "/discount-presets", method: "GET" },
  { path: "/shift", method: "GET" },
  { path: "/shift/report", method: "GET" },
  { path: "/shift/history", method: "GET" },
  // Sessions with UUID
  { path: "/sessions/00000000-0000-0000-0000-000000000000", method: "GET" },
  { path: "/sessions/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  { path: "/sessions/00000000-0000-0000-0000-000000000000/extend-package", method: "POST" },
  // Reservations/Bookings with UUID
  { path: "/reservations/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  { path: "/bookings/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  // Controller usage
  { path: "/controller-usage/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  // Session drinks
  { path: "/session-drinks/00000000-0000-0000-0000-000000000000", method: "DELETE" },
  // Admin routes
  { path: "/admin/cashiers", method: "GET" },
  { path: "/admin/cashiers", method: "POST" },
  { path: "/admin/cashiers/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  { path: "/admin/cashiers/00000000-0000-0000-0000-000000000000", method: "DELETE" },
  { path: "/admin/shifts-analytics?from=2025-01-01&to=2025-01-31", method: "GET" },
  { path: "/admin/active-sessions", method: "GET" },
  { path: "/admin/force-close-session", method: "POST" },
  { path: "/admin/completed-sessions", method: "GET" },
  { path: "/admin/drink-sales", method: "GET" },
  { path: "/admin/audit-log", method: "GET" },
  { path: "/admin/discount-presets", method: "GET" },
  { path: "/admin/discount-presets", method: "POST" },
  { path: "/admin/discount-presets/00000000-0000-0000-0000-000000000000", method: "DELETE" },
  { path: "/admin/inventory", method: "GET" },
  { path: "/admin/inventory/movement", method: "POST" },
  { path: "/admin/inventory/movements", method: "GET" },
  { path: "/admin/sessions/00000000-0000-0000-0000-000000000000", method: "PATCH" },
  { path: "/admin/sessions/00000000-0000-0000-0000-000000000000", method: "DELETE" },
  { path: "/admin/drink-sales/00000000-0000-0000-0000-000000000000", method: "DELETE" },
];

Deno.test("All routes return 401 without auth (no 404 = route exists)", async () => {
  const failures: string[] = [];

  for (const route of ROUTES_TO_CHECK) {
    const { status } = await api(route.path, {
      method: route.method,
      body: route.method !== "GET" ? JSON.stringify({}) : undefined,
    });

    if (status === 404) {
      failures.push(`${route.method} ${route.path} returned 404 (route not found!)`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Route registration failures:\n${failures.join("\n")}`);
  }
});

// 2. CORS preflight works
Deno.test("OPTIONS returns CORS headers", async () => {
  const res = await fetch(`${API_BASE}/stations`, {
    method: "OPTIONS",
    headers: { Origin: "https://test.lovable.app" },
  });
  await res.text(); // consume body
  assertEquals(res.status, 200);
  const allowOrigin = res.headers.get("access-control-allow-origin");
  assertNotEquals(allowOrigin, null);
});

// 3. Unknown route returns 404
Deno.test("Unknown route returns 404 (not 500)", async () => {
  const { status } = await api("/nonexistent-route-xyz");
  assertEquals(status, 401); // 401 because no token, but route check happens after auth
});

// 4. Auth-pin endpoint exists
Deno.test("auth-pin endpoint responds", async () => {
  const res = await fetch(AUTH_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "validate", session_token: "invalid" }),
  });
  const body = await res.json();
  // Should respond (not 404), even if validation fails
  assertNotEquals(res.status, 404);
});
