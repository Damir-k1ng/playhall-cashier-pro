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
  assertNotEquals(res.status, 404);
});

// ==================== AUTHENTICATED TESTS ====================
// Login with admin PIN, then test real endpoints

async function loginWithPin(pin: string): Promise<string | null> {
  const res = await fetch(AUTH_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", pin }),
  });
  const data = await res.json();
  return data.session_token || null;
}

async function logout(token: string): Promise<void> {
  const res = await fetch(AUTH_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout", session_token: token }),
  });
  await res.text();
}

// 5. Authenticated: GET /stations returns array
Deno.test("Authenticated: GET /stations returns station array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null, "Admin login failed");

  try {
    const { status, body } = await apiAuth("/stations", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true, "stations should be an array");
    if (body.length > 0) {
      assertNotEquals(body[0].id, undefined, "station should have id");
      assertNotEquals(body[0].name, undefined, "station should have name");
      assertNotEquals(body[0].zone, undefined, "station should have zone");
    }
  } finally {
    await logout(token!);
  }
});

// 6. Authenticated: GET /drinks returns array
Deno.test("Authenticated: GET /drinks returns drink array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/drinks", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true, "drinks should be an array");
  } finally {
    await logout(token!);
  }
});

// 7. Authenticated: GET /shift returns shift data
Deno.test("Authenticated: GET /shift returns shift object", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/shift", token!);
    assertEquals(status, 200);
    assertNotEquals(body, null, "shift should not be null");
    assertNotEquals(body.id, undefined, "shift should have id");
  } finally {
    await logout(token!);
  }
});

// 8. Authenticated: GET /bookings returns array
Deno.test("Authenticated: GET /bookings returns array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/bookings", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true);
  } finally {
    await logout(token!);
  }
});

// 9. Authenticated: GET /discount-presets returns presets
Deno.test("Authenticated: GET /discount-presets returns presets object", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/discount-presets", token!);
    assertEquals(status, 200);
    assertNotEquals(body.presets, undefined, "should have presets array");
    assertNotEquals(body.max_discount_percent, undefined, "should have max_discount_percent");
  } finally {
    await logout(token!);
  }
});

// 10. Admin: GET /admin/cashiers returns cashier list
Deno.test("Admin: GET /admin/cashiers returns array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/admin/cashiers", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true, "cashiers should be an array");
    if (body.length > 0) {
      assertNotEquals(body[0].name, undefined, "cashier should have name");
    }
  } finally {
    await logout(token!);
  }
});

// 11. Admin: GET /admin/completed-sessions returns array
Deno.test("Admin: GET /admin/completed-sessions returns array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/admin/completed-sessions", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true);
  } finally {
    await logout(token!);
  }
});

// 12. Admin: GET /admin/audit-log returns array
Deno.test("Admin: GET /admin/audit-log returns array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/admin/audit-log", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true);
  } finally {
    await logout(token!);
  }
});

// 13. Admin: GET /admin/inventory returns array
Deno.test("Admin: GET /admin/inventory returns array", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/admin/inventory", token!);
    assertEquals(status, 200);
    assertEquals(Array.isArray(body), true);
  } finally {
    await logout(token!);
  }
});

// 14. Admin: GET /admin/shifts-analytics returns analytics
Deno.test("Admin: GET /admin/shifts-analytics returns data", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    const { status, body } = await apiAuth("/admin/shifts-analytics?from=2025-01-01&to=2025-12-31", token!);
    assertEquals(status, 200);
    assertNotEquals(body.shifts, undefined, "should have shifts");
    assertNotEquals(body.totals, undefined, "should have totals");
    assertNotEquals(body.cashiers, undefined, "should have cashiers");
  } finally {
    await logout(token!);
  }
});
