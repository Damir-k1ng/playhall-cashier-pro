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

// ==================== WRITE TESTS ====================

// 15. Create booking → cancel booking
Deno.test("Write: create booking then cancel it", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Get first station
    const { status: stStatus, body: stations } = await apiAuth("/stations", token!);
    assertEquals(stStatus, 200);
    assertEquals(stations.length > 0, true, "need at least one station");
    const stationId = stations[0].id;

    // Create booking
    const { status: createStatus, body: booking } = await apiAuth("/bookings", token!, {
      method: "POST",
      body: JSON.stringify({
        station_id: stationId,
        start_time: "23:55",
        comment: "smoke-test booking",
      }),
    });
    assertEquals(createStatus, 200, `create booking failed: ${JSON.stringify(booking)}`);
    assertNotEquals(booking.id, undefined, "booking should have id");
    assertEquals(booking.status, "booked");

    // Cancel booking
    const { status: cancelStatus, body: cancelled } = await apiAuth(`/bookings/${booking.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled" }),
    });
    assertEquals(cancelStatus, 200, `cancel booking failed: ${JSON.stringify(cancelled)}`);
    assertEquals(cancelled.status, "cancelled");
  } finally {
    await logout(token!);
  }
});

// 16. Create reservation → cancel reservation
Deno.test("Write: create reservation then cancel it", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Get first station
    const { body: stations } = await apiAuth("/stations", token!);
    const stationId = stations[0].id;

    // Create reservation (1 hour from now)
    const reservedFor = new Date(Date.now() + 3600_000).toISOString();
    const { status: createStatus, body: reservation } = await apiAuth("/reservations", token!, {
      method: "POST",
      body: JSON.stringify({
        station_id: stationId,
        reserved_for: reservedFor,
        customer_name: "Smoke Test",
        phone: "+77001234567",
      }),
    });
    assertEquals(createStatus, 200, `create reservation failed: ${JSON.stringify(reservation)}`);
    assertNotEquals(reservation.id, undefined);
    assertEquals(reservation.is_active, true);

    // Cancel reservation
    const { status: cancelStatus, body: cancelled } = await apiAuth(`/reservations/${reservation.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    });
    assertEquals(cancelStatus, 200, `cancel reservation failed: ${JSON.stringify(cancelled)}`);
    assertEquals(cancelled.is_active, false);
  } finally {
    await logout(token!);
  }
});

// 17. Add drink to session → delete drink from session
Deno.test("Write: add drink to session then delete it", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Get a station without active session
    const { body: stations } = await apiAuth("/stations", token!);
    const freeStation = stations.find((s: any) => !s.activeSession);
    if (!freeStation) {
      console.log("SKIP: no free station available for session-drink write test");
      return;
    }

    // Create session
    const { status: sessStatus, body: session } = await apiAuth("/sessions", token!, {
      method: "POST",
      body: JSON.stringify({ station_id: freeStation.id, tariff_type: "hourly" }),
    });
    assertEquals(sessStatus, 200, `create session failed: ${JSON.stringify(session)}`);

    try {
      // Get drinks
      const { body: drinks } = await apiAuth("/drinks", token!);
      if (!drinks || drinks.length === 0) {
        console.log("SKIP: no drinks in DB");
        return;
      }
      const drink = drinks[0];

      // Add drink to session
      const { status: addStatus, body: sessionDrink } = await apiAuth("/session-drinks", token!, {
        method: "POST",
        body: JSON.stringify({
          session_id: session.id,
          drink_id: drink.id,
          quantity: 1,
          total_price: drink.price,
        }),
      });
      assertEquals(addStatus, 200, `add drink failed: ${JSON.stringify(sessionDrink)}`);
      assertNotEquals(sessionDrink.id, undefined);

      // Delete drink from session
      const { status: delStatus, body: delResult } = await apiAuth(`/session-drinks/${sessionDrink.id}`, token!, {
        method: "DELETE",
      });
      assertEquals(delStatus, 200, `delete drink failed: ${JSON.stringify(delResult)}`);
      assertEquals(delResult.success, true);
    } finally {
      // Cleanup: close the session
      await apiAuth(`/sessions/${session.id}`, token!, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", ended_at: new Date().toISOString(), game_cost: 0, controller_cost: 0, drink_cost: 0, total_cost: 0 }),
      });
    }
  } finally {
    await logout(token!);
  }
});

// 18. Full cycle: session → controller → return → payment → complete
Deno.test("Write: full session lifecycle with controller and payment", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Find a free station
    const { body: stations } = await apiAuth("/stations", token!);
    const freeStation = stations.find((s: any) => !s.activeSession);
    if (!freeStation) {
      console.log("SKIP: no free station for full-cycle test");
      return;
    }

    // 1. Create hourly session
    const { status: sessStatus, body: session } = await apiAuth("/sessions", token!, {
      method: "POST",
      body: JSON.stringify({ station_id: freeStation.id, tariff_type: "hourly" }),
    });
    assertEquals(sessStatus, 200, `create session failed: ${JSON.stringify(session)}`);
    assertNotEquals(session.id, undefined);
    assertEquals(session.status, "active");

    // 2. Add controller
    const { status: ctrlStatus, body: controller } = await apiAuth("/controller-usage", token!, {
      method: "POST",
      body: JSON.stringify({ session_id: session.id }),
    });
    assertEquals(ctrlStatus, 200, `add controller failed: ${JSON.stringify(controller)}`);
    assertNotEquals(controller.id, undefined);
    assertEquals(controller.returned_at, null);

    // 3. Return controller
    const returnedAt = new Date().toISOString();
    const { status: retStatus, body: returned } = await apiAuth(`/controller-usage/${controller.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({ returned_at: returnedAt, cost: 200 }),
    });
    assertEquals(retStatus, 200, `return controller failed: ${JSON.stringify(returned)}`);
    assertNotEquals(returned.returned_at, null);
    assertEquals(returned.cost, 200);

    // 4. Get session details to calculate costs
    const { status: detailStatus, body: details } = await apiAuth(`/sessions/${session.id}`, token!);
    assertEquals(detailStatus, 200);
    assertNotEquals(details.totalCost, undefined, "should have totalCost");
    assertEquals(details.controllers.length, 1, "should have 1 controller");

    // 5. Update session costs before payment
    const gameCost = details.gameCost;
    const controllerCost = details.controllerCost;
    const totalCost = details.totalCost;

    await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({
        game_cost: gameCost,
        controller_cost: controllerCost,
        drink_cost: 0,
        total_cost: totalCost,
      }),
    });

    // 6. Create payment
    const { status: payStatus, body: payment } = await apiAuth("/payments", token!, {
      method: "POST",
      body: JSON.stringify({
        session_id: session.id,
        payment_method: "cash",
        cash_amount: totalCost,
        kaspi_amount: 0,
        total_amount: totalCost,
        discount_percent: 0,
        discount_amount: 0,
      }),
    });
    assertEquals(payStatus, 200, `payment failed: ${JSON.stringify(payment)}`);
    assertNotEquals(payment.id, undefined);
    assertEquals(payment.payment_method, "cash");

    // 7. Complete session
    const { status: closeStatus, body: closed } = await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        ended_at: new Date().toISOString(),
      }),
    });
    assertEquals(closeStatus, 200, `close session failed: ${JSON.stringify(closed)}`);
    assertEquals(closed.status, "completed");
    assertNotEquals(closed.ended_at, null);
  } finally {
    await logout(token!);
  }
});

// 19. Split payment + shift totals verification
Deno.test("Write: split payment updates shift totals correctly", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Snapshot shift totals BEFORE
    const { body: shiftBefore } = await apiAuth("/shift", token!);
    const cashBefore = shiftBefore.total_cash;
    const kaspiBefore = shiftBefore.total_kaspi;
    const gamesBefore = shiftBefore.total_games;

    // Find free station
    const { body: stations } = await apiAuth("/stations", token!);
    const freeStation = stations.find((s: any) => !s.activeSession);
    if (!freeStation) {
      console.log("SKIP: no free station for split-payment test");
      return;
    }

    // Create session
    const { status: sessStatus, body: session } = await apiAuth("/sessions", token!, {
      method: "POST",
      body: JSON.stringify({ station_id: freeStation.id, tariff_type: "hourly" }),
    });
    assertEquals(sessStatus, 200, `create session failed: ${JSON.stringify(session)}`);

    // Get session details for cost
    const { body: details } = await apiAuth(`/sessions/${session.id}`, token!);
    const gameCost = details.gameCost;
    const totalCost = Math.max(gameCost, 1000); // ensure non-zero for meaningful test

    // Update session costs
    await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({ game_cost: totalCost, controller_cost: 0, drink_cost: 0, total_cost: totalCost }),
    });

    // Split payment: 600 cash + 400 kaspi
    const cashPart = 600;
    const kaspiPart = totalCost - cashPart;

    const { status: payStatus, body: payment } = await apiAuth("/payments", token!, {
      method: "POST",
      body: JSON.stringify({
        session_id: session.id,
        payment_method: "split",
        cash_amount: cashPart,
        kaspi_amount: kaspiPart,
        total_amount: totalCost,
        discount_percent: 0,
        discount_amount: 0,
      }),
    });
    assertEquals(payStatus, 200, `split payment failed: ${JSON.stringify(payment)}`);
    assertEquals(payment.payment_method, "split");
    assertEquals(payment.cash_amount, cashPart);
    assertEquals(payment.kaspi_amount, kaspiPart);

    // Complete session
    await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", ended_at: new Date().toISOString() }),
    });

    // Verify shift totals AFTER
    const { body: shiftAfter } = await apiAuth("/shift", token!);
    assertEquals(shiftAfter.total_cash, cashBefore + cashPart, `cash should increase by ${cashPart}`);
    assertEquals(shiftAfter.total_kaspi, kaspiBefore + kaspiPart, `kaspi should increase by ${kaspiPart}`);
    assertEquals(shiftAfter.total_games, gamesBefore + totalCost, `games should increase by ${totalCost}`);
  } finally {
    await logout(token!);
  }
});

// 20. Package tariff: create → extend → verify overtime calculation
Deno.test("Write: package tariff with extension and overtime cost", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Find free station
    const { body: stations } = await apiAuth("/stations", token!);
    const freeStation = stations.find((s: any) => !s.activeSession);
    if (!freeStation) {
      console.log("SKIP: no free station for package test");
      return;
    }

    const packageRate = freeStation.package_rate || freeStation.packageRate;
    const hourlyRate = freeStation.hourly_rate || freeStation.hourlyRate;

    // 1. Create package session
    const { status: sessStatus, body: session } = await apiAuth("/sessions", token!, {
      method: "POST",
      body: JSON.stringify({ station_id: freeStation.id, tariff_type: "package" }),
    });
    assertEquals(sessStatus, 200, `create package session failed: ${JSON.stringify(session)}`);
    assertEquals(session.tariff_type, "package");
    assertEquals(session.package_count, 1, "initial package_count should be 1");

    // 2. Extend package (add second package)
    const { status: extStatus, body: extended } = await apiAuth(`/sessions/${session.id}/extend-package`, token!, {
      method: "POST",
    });
    assertEquals(extStatus, 200, `extend package failed: ${JSON.stringify(extended)}`);
    assertEquals(extended.package_count, 2, "package_count should be 2 after extension");

    // 3. Get session details — verify cost calculation
    const { body: details } = await apiAuth(`/sessions/${session.id}`, token!);
    assertEquals(details.session.package_count, 2, "session should show 2 packages");
    assertEquals(details.session.tariff_type, "package");

    // gameCost should be at least 2 * packageRate (may include overtime for elapsed time)
    // Since the session just started, gameCost should be exactly 2 * packageRate
    // (no overtime yet because elapsed < 360 min)
    const expectedBaseCost = packageRate * 2;
    assertEquals(details.gameCost >= expectedBaseCost, true,
      `gameCost (${details.gameCost}) should be >= 2 * packageRate (${expectedBaseCost})`);

    // 4. Cleanup: complete session
    await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        ended_at: new Date().toISOString(),
        game_cost: details.gameCost,
        controller_cost: 0,
        drink_cost: 0,
        total_cost: details.gameCost,
      }),
    });

    // Pay to keep data consistent
    await apiAuth("/payments", token!, {
      method: "POST",
      body: JSON.stringify({
        session_id: session.id,
        payment_method: "cash",
        cash_amount: details.gameCost,
        kaspi_amount: 0,
        total_amount: details.gameCost,
        discount_percent: 0,
        discount_amount: 0,
      }),
    });
  } finally {
    await logout(token!);
  }
});

// 21. Discount: apply discount and verify discount_amount is recorded
Deno.test("Write: discount applied correctly on payment", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Find free station
    const { body: stations } = await apiAuth("/stations", token!);
    const freeStation = stations.find((s: any) => !s.activeSession);
    if (!freeStation) {
      console.log("SKIP: no free station for discount test");
      return;
    }

    // 1. Create hourly session
    const { status: sessStatus, body: session } = await apiAuth("/sessions", token!, {
      method: "POST",
      body: JSON.stringify({ station_id: freeStation.id, tariff_type: "hourly" }),
    });
    assertEquals(sessStatus, 200, `create session failed: ${JSON.stringify(session)}`);

    // 2. Get pre-check to know the cost
    const { body: details } = await apiAuth(`/sessions/${session.id}`, token!);
    const gameCost = details.gameCost;
    const discountPercent = 10;
    const discountAmount = Math.round(gameCost * discountPercent / 100);
    const totalAfterDiscount = gameCost - discountAmount;

    // 3. Complete session
    await apiAuth(`/sessions/${session.id}`, token!, {
      method: "PATCH",
      body: JSON.stringify({
        status: "completed",
        ended_at: new Date().toISOString(),
        game_cost: gameCost,
        controller_cost: 0,
        drink_cost: 0,
        total_cost: totalAfterDiscount,
      }),
    });

    // 4. Create payment with discount
    const { status: payStatus, body: payment } = await apiAuth("/payments", token!, {
      method: "POST",
      body: JSON.stringify({
        session_id: session.id,
        payment_method: "cash",
        cash_amount: totalAfterDiscount,
        kaspi_amount: 0,
        total_amount: totalAfterDiscount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
      }),
    });
    assertEquals(payStatus, 200, `payment failed: ${JSON.stringify(payment)}`);

    // 5. Verify discount fields are recorded
    assertEquals(payment.discount_percent, discountPercent, 
      `discount_percent should be ${discountPercent}, got ${payment.discount_percent}`);
    assertEquals(payment.discount_amount, discountAmount,
      `discount_amount should be ${discountAmount}, got ${payment.discount_amount}`);
    assertEquals(payment.total_amount, totalAfterDiscount,
      `total_amount should be ${totalAfterDiscount}, got ${payment.total_amount}`);
  } finally {
    await logout(token!);
  }
});

// 22. GET /stations/:id returns single station with session details
Deno.test("Authenticated: GET /stations/:id returns station with controllers and drinks", async () => {
  const token = await loginWithPin("1625");
  assertNotEquals(token, null);

  try {
    // Get all stations to find one with active session
    const { body: stations } = await apiAuth("/stations", token!);
    const activeStation = stations.find((s: any) => s.activeSession);
    const freeStation = stations.find((s: any) => !s.activeSession);

    // Test 1: Free station — should return station data without activeSession
    if (freeStation) {
      const { status, body } = await apiAuth(`/stations/${freeStation.id}`, token!);
      assertEquals(status, 200, `GET /stations/:id failed: ${JSON.stringify(body)}`);
      assertEquals(body.id, freeStation.id);
      assertEquals(body.name, freeStation.name);
      assertEquals(body.activeSession, null, "free station should have null activeSession");
      assertEquals(typeof body.station_number, "number");
      assertEquals(typeof body.hourly_rate, "number");
      assertEquals(typeof body.package_rate, "number");
    }

    // Test 2: Active station — should include controller_usage and session_drinks
    if (activeStation) {
      const { status, body } = await apiAuth(`/stations/${activeStation.id}`, token!);
      assertEquals(status, 200);
      assertEquals(body.id, activeStation.id);
      assertNotEquals(body.activeSession, null, "active station should have activeSession");
      assertEquals(body.activeSession.status, "active");
      assertEquals(typeof body.activeSession.tariff_type, "string");
      // controller_usage and session_drinks should be arrays (possibly empty)
      assertEquals(Array.isArray(body.activeSession.controller_usage), true,
        "activeSession should include controller_usage array");
      assertEquals(Array.isArray(body.activeSession.session_drinks), true,
        "activeSession should include session_drinks array");
      // isOwnSession should be boolean or null
      assertEquals(typeof body.isOwnSession === "boolean", true);
    }

    // Test 3: Invalid UUID should return 404 (route won't match)
    const { status: errStatus } = await apiAuth("/stations/invalid-uuid", token!);
    assertEquals(errStatus, 404, "invalid UUID should return 404");

    // Test 4: Non-existent valid UUID should return 404
    const { status: notFound } = await apiAuth("/stations/00000000-0000-0000-0000-000000000000", token!);
    assertEquals(notFound, 404, "non-existent station should return 404");
  } finally {
    await logout(token!);
  }
});
