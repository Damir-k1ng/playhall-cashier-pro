import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==================== CORS ====================
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (origin.includes('.lovable.app')) return true
  if (origin.includes('.lovableproject.com')) return true
  if (origin.startsWith('http://localhost:')) return true
  return false
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  }
}

function jsonResponse(data: any, corsHeaders: Record<string, string>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  })
}

function errorResponse(error: string, corsHeaders: Record<string, string>, status = 400) {
  return jsonResponse({ error }, corsHeaders, status)
}

// ==================== VALIDATION ====================
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function validatePayment(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) return { valid: false, error: 'Invalid session_id' }
  if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) return { valid: false, error: 'Invalid payment_method' }
  if (typeof body.total_amount !== 'number' || body.total_amount < 0) return { valid: false, error: 'Invalid total_amount' }
  if (body.cash_amount !== undefined && (typeof body.cash_amount !== 'number' || body.cash_amount < 0)) return { valid: false, error: 'Invalid cash_amount' }
  if (body.kaspi_amount !== undefined && (typeof body.kaspi_amount !== 'number' || body.kaspi_amount < 0)) return { valid: false, error: 'Invalid kaspi_amount' }
  return { valid: true }
}

function validateSession(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) return { valid: false, error: 'Invalid station_id' }
  if (!['hourly', 'package'].includes(body.tariff_type)) return { valid: false, error: 'Invalid tariff_type' }
  return { valid: true }
}

function validateReservation(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) return { valid: false, error: 'Invalid station_id' }
  if (!body.reserved_for) return { valid: false, error: 'Invalid reserved_for' }
  if (body.customer_name && body.customer_name.length > 100) return { valid: false, error: 'customer_name too long' }
  if (body.phone && !/^[0-9+\-\s()]+$/.test(body.phone)) return { valid: false, error: 'Invalid phone format' }
  return { valid: true }
}

function validateBooking(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) return { valid: false, error: 'Invalid station_id' }
  if (!body.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) return { valid: false, error: 'Invalid start_time format' }
  if (body.comment && body.comment.length > 200) return { valid: false, error: 'comment too long' }
  return { valid: true }
}

function validateControllerUsage(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) return { valid: false, error: 'Invalid session_id' }
  return { valid: true }
}

function validateSessionDrink(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) return { valid: false, error: 'Invalid session_id' }
  if (!body.drink_id || !isValidUUID(body.drink_id)) return { valid: false, error: 'Invalid drink_id' }
  if (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 100) return { valid: false, error: 'Invalid quantity' }
  if (typeof body.total_price !== 'number' || body.total_price < 0) return { valid: false, error: 'Invalid total_price' }
  return { valid: true }
}

function validateDrinkSale(body: any): { valid: boolean; error?: string } {
  if (!body.drink_id || !isValidUUID(body.drink_id)) return { valid: false, error: 'Invalid drink_id' }
  if (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 100) return { valid: false, error: 'Invalid quantity' }
  if (typeof body.total_price !== 'number' || body.total_price < 0) return { valid: false, error: 'Invalid total_price' }
  if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) return { valid: false, error: 'Invalid payment_method' }
  return { valid: true }
}

function validateCashier(body: any): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) return { valid: false, error: 'Имя обязательно' }
  if (body.name.length > 50) return { valid: false, error: 'Имя слишком длинное' }
  if (!body.pin || typeof body.pin !== 'string' || !/^\d{4}$/.test(body.pin)) return { valid: false, error: 'PIN должен содержать 4 цифры' }
  return { valid: true }
}

// ==================== AUTH HELPERS ====================
async function getUserRole(supabase: any, cashierId: string): Promise<string> {
  const { data } = await supabase.from('user_roles').select('role').eq('cashier_id', cashierId).single()
  return data?.role || 'cashier'
}

async function authenticateSession(supabase: any, sessionToken: string | null) {
  if (!sessionToken) return null
  const { data: shift } = await supabase
    .from('shifts')
    .select('*, cashier:users!shifts_cashier_id_fkey(*)')
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .single()
  return shift
}

/** Authenticate platform_owner via Supabase JWT (Authorization: Bearer ...) or X-Platform-Key header */
async function authenticatePlatformOwner(supabase: any, req: Request) {
  // Option 1: Service role bypass via X-Platform-Key header (matches service role key)
  const platformKey = req.headers.get('x-platform-key')
  if (platformKey && platformKey === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    // Return a synthetic platform_owner for service-role access
    const { data: platformUser } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'platform_owner')
      .limit(1)
      .single()
    
    return platformUser || { id: 'service-role', name: 'Service Role', role: 'platform_owner' }
  }
  
  // Option 2: Supabase Auth JWT
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '')
  
  try {
    // Verify JWT using Supabase Auth
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null

    // Check if user has platform_owner role
    const { data: platformUser } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .eq('role', 'platform_owner')
      .single()

    return platformUser || null
  } catch (error) {
    console.error('Platform auth error:', error)
    return null
  }
}

// ==================== CONTEXT TYPE ====================
type Ctx = {
  req: Request
  supabase: any
  shift?: any // Optional for platform operations
  tenant_id?: string // Optional for platform operations
  platformUser?: any // For platform_owner operations
  url: URL
  cors: Record<string, string>
  path: string
  method: string
  pathParts: string[]
}

// ==================== TENANT HELPERS ====================
/** Injects tenant_id from ctx into a data object for INSERT operations */
function withTenant<T extends Record<string, any>>(data: T, ctx: Ctx): T & { tenant_id: string } {
  if (!ctx.tenant_id) throw new Error('tenant_id required for this operation')
  return { ...data, tenant_id: ctx.tenant_id }
}

/** Applies .eq('tenant_id', ctx.tenant_id) to a Supabase query for filtering */
function tenantFilter(query: any, ctx: Ctx) {
  if (!ctx.tenant_id) throw new Error('tenant_id required for this operation')
  return query.eq('tenant_id', ctx.tenant_id)
}

// ==================== ROUTE HANDLERS ====================

async function handleGetStations(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors } = ctx
  const today = new Date().toISOString().split('T')[0]

  const [stationsResult, sessionsResult, reservationsResult, bookingsResult] = await Promise.all([
    tenantFilter(supabase.from('stations').select('*'), ctx).order('station_number'),
    tenantFilter(supabase.from('sessions').select('*, controller_usage(*), session_drinks(*, drinks(*))'), ctx).eq('status', 'active'),
    tenantFilter(supabase.from('reservations').select('*'), ctx).eq('is_active', true),
    tenantFilter(supabase.from('bookings').select('*'), ctx).eq('status', 'booked').eq('booking_date', today),
  ])

  const stations = stationsResult.data || []
  const activeSessions = sessionsResult.data || []
  const activeReservations = reservationsResult.data || []
  const activeBookings = bookingsResult.data || []

  const sessionMap = new Map(activeSessions.map((s: any) => [s.station_id, s]))
  const reservationMap = new Map(activeReservations.map((r: any) => [r.station_id, r]))
  const bookingMap = new Map(activeBookings.map((b: any) => [b.station_id, b]))

  const stationsWithData = stations.map((station: any) => {
    const activeSession = sessionMap.get(station.id) || null
    return {
      ...station,
      activeSession,
      activeReservation: reservationMap.get(station.id) || null,
      activeBooking: bookingMap.get(station.id) || null,
      isOwnSession: activeSession ? activeSession.shift_id === shift.id : null,
    }
  })

  return jsonResponse(stationsWithData, cors, 200, { 'Cache-Control': 'private, max-age=2' })
}

async function handleGetSingleStation(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid station ID', cors)

  const [stationResult, sessionResult, reservationResult, bookingResult] = await Promise.all([
    tenantFilter(supabase.from('stations').select('*'), ctx).eq('id', id).single(),
    tenantFilter(supabase.from('sessions').select('*, controller_usage(*), session_drinks(*, drinks(*))'), ctx).eq('station_id', id).eq('status', 'active').maybeSingle(),
    tenantFilter(supabase.from('reservations').select('*'), ctx).eq('station_id', id).eq('is_active', true).maybeSingle(),
    tenantFilter(supabase.from('bookings').select('*'), ctx).eq('station_id', id).eq('status', 'booked').eq('booking_date', new Date().toISOString().split('T')[0]).maybeSingle(),
  ])

  if (stationResult.error || !stationResult.data) return errorResponse('Station not found', cors, 404)

  const station = stationResult.data
  const activeSession = sessionResult.data || null

  return jsonResponse({
    ...station,
    activeSession,
    activeReservation: reservationResult.data || null,
    activeBooking: bookingResult.data || null,
    isOwnSession: activeSession ? activeSession.shift_id === shift.id : null,
  }, cors, 200, { 'Cache-Control': 'private, max-age=1' })
}

async function handleGetDrinks(ctx: Ctx): Promise<Response> {
  const { data } = await tenantFilter(ctx.supabase.from('drinks').select('*'), ctx).order('name')
  return jsonResponse(data, ctx.cors)
}

async function handleGetReservations(ctx: Ctx): Promise<Response> {
  const { data } = await tenantFilter(ctx.supabase.from('reservations').select('*, station:stations(id, name, zone)'), ctx)
    .eq('is_active', true)
    .gte('reserved_for', new Date().toISOString())
    .order('reserved_for', { ascending: true })
  return jsonResponse(data, ctx.cors)
}

async function handleGetBookings(ctx: Ctx): Promise<Response> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await tenantFilter(ctx.supabase.from('bookings').select('*, station:stations(id, name, zone)'), ctx)
    .eq('booking_date', today)
    .order('start_time', { ascending: true })
  return jsonResponse(data, ctx.cors)
}

async function handleCreateSession(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req } = ctx
  const body = await req.json()
  const v = validateSession(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data: existingSession } = await tenantFilter(
    supabase.from('sessions').select('id').eq('station_id', body.station_id).eq('status', 'active'), ctx
  ).maybeSingle()
  if (existingSession) return errorResponse('На этой станции уже есть активная сессия', cors, 409)

  const insertData: any = { station_id: body.station_id, tariff_type: body.tariff_type, status: 'active', shift_id: shift.id }
  if (body.tariff_type === 'package') insertData.package_count = 1

  const { data, error } = await supabase.from('sessions').insert(withTenant(insertData, ctx)).select().single()
  if (error) { console.error('Session create error:', error); return errorResponse('Unable to create session', cors) }
  return jsonResponse(data, cors)
}

async function handleGetSession(ctx: Ctx): Promise<Response> {
  const { supabase, cors, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid session ID', cors)

  const { data: session, error } = await tenantFilter(supabase.from('sessions').select('*, station:stations(*)'), ctx).eq('id', id).single()
  if (error || !session) return errorResponse('Session not found', cors, 404)

  const { data: controllers } = await tenantFilter(supabase.from('controller_usage').select('*'), ctx).eq('session_id', id)
  const { data: drinks } = await tenantFilter(supabase.from('session_drinks').select('*, drink:drinks(*)'), ctx).eq('session_id', id)

  const now = new Date()
  const startedAt = new Date(session.started_at)
  const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

  let gameCost = 0
  const packageCount = session.package_count || 1
  const packageDurationMinutes = 180 * packageCount

  if (session.tariff_type === 'package') {
    gameCost = (session.station?.package_rate || 0) * packageCount
    if (elapsedMinutes > packageDurationMinutes) {
      const overtimeMinutes = elapsedMinutes - packageDurationMinutes
      gameCost += Math.ceil(overtimeMinutes / 60) * (session.station?.hourly_rate || 0)
    }
  } else {
    gameCost = Math.ceil(elapsedMinutes / 60) * (session.station?.hourly_rate || 0)
  }

  let controllerCost = 0
  for (const controller of (controllers || [])) {
    const takenAt = new Date(controller.taken_at)
    const returnedAt = controller.returned_at ? new Date(controller.returned_at) : now
    const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
    controllerCost += Math.ceil(mins / 60) * 600
  }

  const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)

  return jsonResponse({
    session, station: session.station, controllers: controllers || [], drinks: drinks || [],
    elapsedMinutes, gameCost, controllerCost, drinkCost, totalCost: gameCost + controllerCost + drinkCost,
  }, cors)
}

async function handleExtendPackage(ctx: Ctx): Promise<Response> {
  const { supabase, cors, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid session ID', cors)

  const { data: session, error: sessionError } = await tenantFilter(
    supabase.from('sessions').select('*, station:stations(*)'), ctx
  ).eq('id', id).single()
  if (sessionError || !session) return errorResponse('Session not found', cors, 404)
  if (session.tariff_type !== 'package') return errorResponse('Только пакетные сессии могут быть продлены', cors)
  if (session.status !== 'active') return errorResponse('Сессия уже завершена', cors)

  const newPackageCount = (session.package_count || 1) + 1
  const { data: updatedSession, error: updateError } = await tenantFilter(
    supabase.from('sessions').update({ package_count: newPackageCount }), ctx
  ).eq('id', id).select().single()
  if (updateError) { console.error('Extend package error:', updateError); return errorResponse('Не удалось продлить пакет', cors) }

  return jsonResponse({ success: true, package_count: newPackageCount, session: updatedSession }, cors)
}

async function handleUpdateSession(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid session ID', cors)

  const { data: existingSession } = await tenantFilter(supabase.from('sessions').select('shift_id'), ctx).eq('id', id).single()
  if (!existingSession) return errorResponse('Session not found', cors, 404)

  const body = await req.json()
  const allowedFields = ['status', 'ended_at', 'game_cost', 'controller_cost', 'drink_cost', 'total_cost']
  const updateData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field]
  }

  const { data, error } = await tenantFilter(supabase.from('sessions').update(updateData), ctx).eq('id', id).select().single()
  if (error) { console.error('Session update error:', error); return errorResponse('Unable to update session', cors) }
  return jsonResponse(data, cors)
}

async function handleGetDiscountPresets(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors } = ctx
  const { data: cashierData } = await supabase.from('users').select('max_discount_percent').eq('id', shift.cashier_id).single()
  const maxDiscount = cashierData?.max_discount_percent || 0
  const { data: presets } = await tenantFilter(supabase.from('discount_presets').select('*'), ctx).eq('is_active', true).lte('percent', maxDiscount).order('percent')
  return jsonResponse({ presets: presets || [], max_discount_percent: maxDiscount }, cors)
}

async function handleCreatePayment(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req } = ctx
  const body = await req.json()
  const v = validatePayment(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data: sessionData } = await tenantFilter(
    supabase.from('sessions').select('shift_id, game_cost, controller_cost, drink_cost'), ctx
  ).eq('id', body.session_id).single()
  if (!sessionData) return errorResponse('Session not found', cors, 404)

  const { data, error } = await supabase.from('payments').insert(withTenant({
    session_id: body.session_id, payment_method: body.payment_method,
    cash_amount: body.cash_amount || 0, kaspi_amount: body.kaspi_amount || 0,
    total_amount: body.total_amount, discount_percent: body.discount_percent || 0,
    discount_amount: body.discount_amount || 0, shift_id: shift.id,
  }, ctx)).select().single()
  if (error) { console.error('Payment create error:', error); return errorResponse('Unable to create payment', cors) }

  const gameCost = sessionData?.game_cost || 0
  const controllerCost = sessionData?.controller_cost || 0
  const drinkCost = sessionData?.drink_cost || 0
  await supabase.rpc('increment_shift_totals', {
    p_shift_id: shift.id,
    p_cash: body.cash_amount || 0,
    p_kaspi: body.kaspi_amount || 0,
    p_games: gameCost,
    p_controllers: controllerCost,
    p_drinks: drinkCost,
  })

  return jsonResponse(data, cors)
}

async function handleCreateControllerUsage(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req } = ctx
  const body = await req.json()
  const v = validateControllerUsage(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data: recentController } = await tenantFilter(
    supabase.from('controller_usage').select('id, taken_at').eq('session_id', body.session_id), ctx
  ).order('taken_at', { ascending: false }).limit(1).maybeSingle()
  if (recentController) {
    const timeSinceLastAdd = Date.now() - new Date(recentController.taken_at).getTime()
    if (timeSinceLastAdd < 3000) return errorResponse('Защита от дублей! Добавьте через 3 секунды!', cors, 429)
  }

  const { data, error } = await supabase.from('controller_usage').insert(withTenant({ session_id: body.session_id }, ctx)).select().single()
  if (error) { console.error('Controller usage create error:', error); return errorResponse('Unable to add controller', cors) }
  return jsonResponse(data, cors)
}

async function handleUpdateControllerUsage(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid controller usage ID', cors)

  const body = await req.json()
  const updateData: Record<string, any> = {}
  if (body.returned_at) updateData.returned_at = body.returned_at
  if (typeof body.cost === 'number' && body.cost >= 0) updateData.cost = body.cost

  const { data, error } = await tenantFilter(supabase.from('controller_usage').update(updateData), ctx).eq('id', id).select().single()
  if (error) { console.error('Controller usage update error:', error); return errorResponse('Unable to update controller usage', cors) }
  return jsonResponse(data, cors)
}

async function handleAddSessionDrink(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req } = ctx
  const body = await req.json()
  const v = validateSessionDrink(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data, error } = await supabase.from('session_drinks').insert(withTenant({
    session_id: body.session_id, drink_id: body.drink_id, quantity: body.quantity, total_price: body.total_price,
  }, ctx)).select().single()
  if (error) { console.error('Session drink create error:', error); return errorResponse('Unable to add drink', cors) }
  return jsonResponse(data, cors)
}

async function handleDeleteSessionDrink(ctx: Ctx): Promise<Response> {
  const { supabase, cors, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid session drink ID', cors)

  const { data: sessionDrink } = await tenantFilter(
    supabase.from('session_drinks').select('*, session:sessions(id, status, shift_id)'), ctx
  ).eq('id', id).single()
  if (!sessionDrink) return errorResponse('Напиток не найден', cors, 404)
  if (sessionDrink.session?.status !== 'active') return errorResponse('Сессия уже завершена', cors)

  const { error } = await tenantFilter(supabase.from('session_drinks').delete(), ctx).eq('id', id)
  if (error) { console.error('Session drink delete error:', error); return errorResponse('Не удалось удалить напиток', cors) }
  return jsonResponse({ success: true }, cors)
}

async function handleCreateDrinkSale(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req } = ctx
  const body = await req.json()
  const v = validateDrinkSale(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data, error } = await supabase.from('drink_sales').insert(withTenant({
    drink_id: body.drink_id, quantity: body.quantity, total_price: body.total_price,
    payment_method: body.payment_method, cash_amount: body.cash_amount || 0,
    kaspi_amount: body.kaspi_amount || 0, shift_id: shift.id,
  }, ctx)).select().single()
  if (error) { console.error('Drink sale create error:', error); return errorResponse('Unable to create drink sale', cors) }

  await supabase.rpc('increment_shift_totals', {
    p_shift_id: shift.id,
    p_cash: body.cash_amount || 0,
    p_kaspi: body.kaspi_amount || 0,
    p_drinks: body.total_price,
  })

  return jsonResponse(data, cors)
}

async function handleCreateReservation(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req } = ctx
  const body = await req.json()
  const v = validateReservation(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data, error } = await supabase.from('reservations').insert(withTenant({
    station_id: body.station_id, reserved_for: body.reserved_for,
    customer_name: body.customer_name || null, phone: body.phone || null,
    notes: body.notes || null, is_active: true, shift_id: shift.id,
  }, ctx)).select().single()
  if (error) { console.error('Reservation create error:', error); return errorResponse('Unable to create reservation', cors) }
  return jsonResponse(data, cors)
}

async function handleUpdateReservation(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid reservation ID', cors)

  const body = await req.json()
  const updateData: Record<string, any> = {}
  if (typeof body.is_active === 'boolean') updateData.is_active = body.is_active

  const { data, error } = await tenantFilter(supabase.from('reservations').update(updateData), ctx).eq('id', id).select().single()
  if (error) { console.error('Reservation update error:', error); return errorResponse('Unable to update reservation', cors) }
  return jsonResponse(data, cors)
}

async function handleCreateBooking(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req } = ctx
  const body = await req.json()
  const v = validateBooking(body)
  if (!v.valid) return errorResponse(v.error!, cors)

  const { data, error } = await supabase.from('bookings').insert(withTenant({
    station_id: body.station_id, start_time: body.start_time,
    comment: body.comment || null, status: 'booked',
  }, ctx)).select().single()
  if (error) { console.error('Booking create error:', error); return errorResponse('Unable to create booking', cors) }
  return jsonResponse(data, cors)
}

async function handleUpdateBooking(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req, path } = ctx
  const id = path.split('/')[2]
  if (!isValidUUID(id)) return errorResponse('Invalid booking ID', cors)

  const body = await req.json()
  const updateData: Record<string, any> = {}
  if (['booked', 'cancelled', 'completed'].includes(body.status)) updateData.status = body.status

  const { data, error } = await tenantFilter(supabase.from('bookings').update(updateData), ctx).eq('id', id).select().single()
  if (error) { console.error('Booking update error:', error); return errorResponse('Unable to update booking', cors) }
  return jsonResponse(data, cors)
}

async function handleGetShift(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors } = ctx
  const { data: shiftData } = await tenantFilter(supabase.from('shifts').select('*'), ctx).eq('id', shift.id).single()

  if (shiftData?.is_admin_session) {
    const now = new Date()
    const utc5Now = new Date(now.getTime() + 5 * 60 * 60 * 1000)
    const hour = utc5Now.getUTCHours()

    const operationalDate = new Date(utc5Now)
    if (hour < 4) {
      operationalDate.setUTCDate(operationalDate.getUTCDate() - 1)
    }

    const dayStart = new Date(operationalDate)
    dayStart.setUTCHours(11, 0, 0, 0)
    const dayEnd = new Date(operationalDate)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    dayEnd.setUTCHours(23, 0, 0, 0)

    const { data: allShifts } = await tenantFilter(
      supabase.from('shifts').select('total_cash, total_kaspi, total_games, total_controllers, total_drinks, is_admin_session'), ctx
    ).eq('is_admin_session', false)
      .gte('started_at', dayStart.toISOString())
      .lte('started_at', dayEnd.toISOString())

    const dailyTotals = {
      total_cash: 0, total_kaspi: 0, total_games: 0, total_controllers: 0, total_drinks: 0
    }
    for (const s of (allShifts || [])) {
      dailyTotals.total_cash += s.total_cash || 0
      dailyTotals.total_kaspi += s.total_kaspi || 0
      dailyTotals.total_games += s.total_games || 0
      dailyTotals.total_controllers += s.total_controllers || 0
      dailyTotals.total_drinks += s.total_drinks || 0
    }

    return jsonResponse({ ...shiftData, daily_totals: dailyTotals }, cors)
  }

  return jsonResponse(shiftData, cors)
}

async function handleGetShiftReport(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors } = ctx
  const [{ data: payments }, { data: drinkSales }, { data: sessions }] = await Promise.all([
    tenantFilter(supabase.from('payments').select('*'), ctx).eq('shift_id', shift.id),
    tenantFilter(supabase.from('drink_sales').select('*, drinks(*)'), ctx).eq('shift_id', shift.id),
    tenantFilter(supabase.from('sessions').select('*'), ctx).eq('shift_id', shift.id),
  ])
  return jsonResponse({ shift, payments, drinkSales, sessions }, cors)
}

async function handleGetShiftHistory(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors } = ctx

  const { data: paymentsData } = await tenantFilter(
    supabase.from('payments').select('session_id, payment_method, cash_amount, kaspi_amount'), ctx
  ).eq('shift_id', shift.id)

  const paymentMap = new Map((paymentsData || []).map((p: any) => [p.session_id, p]))
  const paidSessionIds = Array.from(paymentMap.keys())

  let sessionsData: any[] = []
  if (paidSessionIds.length > 0) {
    const { data: byPayment } = await tenantFilter(
      supabase.from('sessions').select('*, station:stations(*)'), ctx
    ).in('id', paidSessionIds).eq('status', 'completed')
      .order('ended_at', { ascending: false })
    sessionsData = byPayment || []
  }

  const { data: byShift } = await tenantFilter(
    supabase.from('sessions').select('*, station:stations(*)'), ctx
  ).eq('shift_id', shift.id).eq('status', 'completed')
    .order('ended_at', { ascending: false })

  const sessionIds = new Set(sessionsData.map((s: any) => s.id))
  for (const s of (byShift || [])) {
    if (!sessionIds.has(s.id)) {
      sessionsData.push(s)
      sessionIds.add(s.id)
    }
  }

  const sessionsWithDetails = await Promise.all(
    sessionsData.map(async (session: any) => {
      const { data: controllers } = await tenantFilter(supabase.from('controller_usage').select('*'), ctx).eq('session_id', session.id)
      const { count: drinksCount } = await tenantFilter(supabase.from('session_drinks').select('*', { count: 'exact', head: true }), ctx).eq('session_id', session.id)
      const payment = paymentMap.get(session.id)

      return {
        ...session, controllers: controllers || [], drinks_count: drinksCount || 0,
        payment_method: payment?.payment_method || 'cash',
        cash_amount: payment?.cash_amount || 0, kaspi_amount: payment?.kaspi_amount || 0,
      }
    })
  )

  const { data: drinkSalesData } = await tenantFilter(
    supabase.from('drink_sales').select('*, drink:drinks(*)'), ctx
  ).eq('shift_id', shift.id).order('created_at', { ascending: false })

  return jsonResponse({ sessions: sessionsWithDetails || [], drinkSales: drinkSalesData || [] }, cors)
}

// ==================== ADMIN ROUTE HANDLERS ====================

async function handleAdminGetCashiers(ctx: Ctx): Promise<Response> {
  const { data, error } = await tenantFilter(ctx.supabase.from('users').select('id, name, pin_code, created_at, max_discount_percent'), ctx).eq('role', 'cashier').order('created_at')
  if (error) return errorResponse('Ошибка загрузки кассиров', ctx.cors, 500)
  // Map pin_code to pin for backward compatibility with frontend
  const mapped = (data || []).map((u: any) => ({ ...u, pin: u.pin_code, pin_code: undefined }))
  return jsonResponse(mapped, ctx.cors)
}

async function handleAdminCreateCashier(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json()
  const v = validateCashier(body)
  if (!v.valid) return errorResponse(v.error!, ctx.cors)

  const { data, error } = await ctx.supabase.from('users').insert({ name: body.name.trim(), pin_code: body.pin, tenant_id: ctx.tenant_id, role: 'cashier' }).select().single()
  if (error) {
    if (error.code === '23505') return errorResponse('PIN-код уже существует', ctx.cors)
    return errorResponse('Ошибка создания кассира', ctx.cors, 500)
  }
  return jsonResponse({ ...data, pin: data.pin_code }, ctx.cors)
}

async function handleAdminUpdateCashier(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req, path } = ctx
  const id = path.split('/')[3]
  if (!isValidUUID(id)) return errorResponse('Invalid cashier ID', cors)

  const body = await req.json()
  const updateData: Record<string, any> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return errorResponse('Имя обязательно', cors)
    if (body.name.length > 50) return errorResponse('Имя слишком длинное', cors)
    updateData.name = body.name.trim()
  }
  if (body.pin !== undefined) {
    if (!/^\d{4}$/.test(body.pin)) return errorResponse('PIN должен содержать 4 цифры', cors)
    updateData.pin_code = body.pin
  }
  if (body.max_discount_percent !== undefined) {
    const maxDiscount = parseInt(body.max_discount_percent)
    if (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) return errorResponse('Процент скидки должен быть от 0 до 100', cors)
    updateData.max_discount_percent = maxDiscount
  }
  if (Object.keys(updateData).length === 0) return errorResponse('Нет данных для обновления', cors)

  const { data, error } = await tenantFilter(supabase.from('users').update(updateData), ctx).eq('id', id).eq('role', 'cashier').select().single()
  if (error) {
    if (error.code === '23505') return errorResponse('PIN-код уже существует', cors)
    return errorResponse('Ошибка обновления кассира', cors, 500)
  }
  return jsonResponse({ ...data, pin: data.pin_code }, cors)
}

async function handleAdminDeleteCashier(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, path } = ctx
  const id = path.split('/')[3]
  if (!isValidUUID(id)) return errorResponse('Invalid cashier ID', cors)
  if (id === shift.cashier_id) return errorResponse('Нельзя удалить себя', cors)

  const { data: activeShift } = await tenantFilter(supabase.from('shifts').select('id'), ctx).eq('cashier_id', id).eq('is_active', true).maybeSingle()
  if (activeShift) return errorResponse('У кассира активная смена', cors)

  const { error } = await tenantFilter(supabase.from('users').delete(), ctx).eq('id', id).eq('role', 'cashier')
  if (error) return errorResponse('Ошибка удаления кассира', cors, 500)
  return jsonResponse({ success: true }, cors)
}

// ---- Analytics helpers ----
function getWorkingDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  const utcHour = d.getUTCHours()
  const astanaHour = (utcHour + 5) % 24
  const workingDay = new Date(d)
  if (astanaHour >= 0 && astanaHour < 4) workingDay.setUTCDate(workingDay.getUTCDate() - 1)
  return workingDay.toISOString().split('T')[0]
}

async function fetchShiftsForPeriod(supabase: any, ctx: Ctx, periodFrom: Date, periodTo: Date, filterCashierId?: string | null, excludeActive = true) {
  let allShifts: any[] = []
  let offset = 0
  const PAGE_SIZE = 1000

  while (true) {
    let query = tenantFilter(
      supabase.from('shifts').select('id, cashier_id, started_at, ended_at, is_active, total_cash, total_kaspi, total_games, total_controllers, total_drinks, cashier:users!shifts_cashier_id_fkey(name)'), ctx
    ).lte('started_at', periodTo.toISOString())
      .or(`ended_at.gte.${periodFrom.toISOString()},ended_at.is.null`)
      .order('started_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (excludeActive) query = query.eq('is_active', false)
    query = query.eq('is_admin_session', false)
    if (filterCashierId && isValidUUID(filterCashierId)) query = query.eq('cashier_id', filterCashierId)

    const { data, error } = await query
    if (error) throw error
    allShifts = allShifts.concat(data || [])
    if (!data || data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return allShifts
}

async function fetchSessionCounts(supabase: any, ctx: Ctx, shiftIds: string[]) {
  const counts: Record<string, number> = {}
  if (shiftIds.length === 0) return counts

  for (let i = 0; i < shiftIds.length; i += 100) {
    const batch = shiftIds.slice(i, i + 100)
    let offset = 0
    const PAGE_SIZE = 1000
    while (true) {
      const { data } = await tenantFilter(supabase.from('sessions').select('shift_id'), ctx).in('shift_id', batch).eq('status', 'completed').range(offset, offset + PAGE_SIZE - 1)
      ;(data || []).forEach((s: any) => { counts[s.shift_id] = (counts[s.shift_id] || 0) + 1 })
      if (!data || data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
  }
  return counts
}

function formatShifts(shifts: any[], sessionCounts: Record<string, number>) {
  return shifts.map((s: any) => {
    const startedAt = new Date(s.started_at)
    const endedAt = s.ended_at ? new Date(s.ended_at) : new Date()
    const durationHours = (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
    return {
      id: s.id, cashier_id: s.cashier_id, cashier_name: s.cashier?.name || 'Unknown',
      started_at: s.started_at, ended_at: s.ended_at, is_active: s.is_active,
      total_cash: s.total_cash || 0, total_kaspi: s.total_kaspi || 0,
      total_games: s.total_games || 0, total_controllers: s.total_controllers || 0,
      total_drinks: s.total_drinks || 0, sessions_count: sessionCounts[s.id] || 0,
      duration_hours: Math.round(durationHours * 10) / 10,
    }
  })
}

function calculatePeriodTotals(formattedShifts: any[]) {
  const workingDays = new Set<string>()
  formattedShifts.forEach((s: any) => { workingDays.add(getWorkingDayKey(s.started_at)) })

  const raw = formattedShifts.reduce((acc: any, s: any) => ({
    revenue: acc.revenue + s.total_cash + s.total_kaspi,
    cash: acc.cash + s.total_cash, kaspi: acc.kaspi + s.total_kaspi,
    games: acc.games + s.total_games, controllers: acc.controllers + s.total_controllers,
    drinks: acc.drinks + s.total_drinks, sessions: acc.sessions + s.sessions_count,
    totalHours: acc.totalHours + (s.duration_hours || 0),
  }), { revenue: 0, cash: 0, kaspi: 0, games: 0, controllers: 0, drinks: 0, sessions: 0, totalHours: 0 })

  return {
    ...raw,
    shifts: formattedShifts.length,
    workingDays: workingDays.size,
    avgRevenuePerDay: workingDays.size > 0 ? Math.round(raw.revenue / workingDays.size) : 0,
    avgRevenuePerShift: formattedShifts.length > 0 ? Math.round(raw.revenue / formattedShifts.length) : 0,
    avgSessionsPerDay: workingDays.size > 0 ? Math.round(raw.sessions / workingDays.size * 10) / 10 : 0,
  }
}

async function handleAdminShiftsAnalytics(ctx: Ctx): Promise<Response> {
  const { supabase, cors, url } = ctx
  try {
    const fromStr = url.searchParams.get('from')
    const toStr = url.searchParams.get('to')
    const cashierId = url.searchParams.get('cashier_id')

    if (!fromStr || !toStr) return errorResponse('from and to are required', cors)
    const from = new Date(fromStr)
    const to = new Date(toStr)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return errorResponse('Invalid date format', cors)

    const { data: allCashiers } = await tenantFilter(supabase.from('users').select('id, name'), ctx).eq('role', 'cashier').order('name')
    const filteredCashiers = allCashiers || []

    const shifts = await fetchShiftsForPeriod(supabase, ctx, from, to, cashierId, true)
    const shiftIds = shifts.map((s: any) => s.id)
    const sessionCounts = await fetchSessionCounts(supabase, ctx, shiftIds)
    const fmtShifts = formatShifts(shifts, sessionCounts)
    const totals = calculatePeriodTotals(fmtShifts)

    const periodLength = to.getTime() - from.getTime()
    const prevFrom = new Date(from.getTime() - periodLength)
    const prevTo = new Date(from.getTime() - 1)
    const prevShifts = await fetchShiftsForPeriod(supabase, ctx, prevFrom, prevTo, cashierId, true)
    const prevShiftIds = prevShifts.map((s: any) => s.id)
    const prevSessionCounts = await fetchSessionCounts(supabase, ctx, prevShiftIds)
    const prevFmtShifts = formatShifts(prevShifts, prevSessionCounts)
    const previousPeriodTotals = calculatePeriodTotals(prevFmtShifts)

    // Drink analytics
    let drinkAnalytics: any = { topDrinks: [], drinksByDay: [] }
    if (shiftIds.length > 0) {
      let allDrinkSales: any[] = []
      for (let i = 0; i < shiftIds.length; i += 100) {
        const batch = shiftIds.slice(i, i + 100)
        let offset = 0
        while (true) {
          const { data } = await tenantFilter(supabase.from('drink_sales')
            .select('id, shift_id, drink_id, quantity, total_price, payment_method, cash_amount, kaspi_amount, created_at, drinks(name, price)'), ctx)
            .in('shift_id', batch).range(offset, offset + 999)
          allDrinkSales = allDrinkSales.concat(data || [])
          if (!data || data.length < 1000) break
          offset += 1000
        }
      }

      let allSessionDrinks: any[] = []
      for (let i = 0; i < shiftIds.length; i += 100) {
        const batch = shiftIds.slice(i, i + 100)
        const { data: sessionsForDrinks } = await tenantFilter(supabase.from('sessions').select('id, shift_id'), ctx).in('shift_id', batch).eq('status', 'completed')
        const sessionIds = (sessionsForDrinks || []).map((s: any) => s.id)
        if (sessionIds.length > 0) {
          for (let j = 0; j < sessionIds.length; j += 100) {
            const sessionBatch = sessionIds.slice(j, j + 100)
            const { data } = await tenantFilter(supabase.from('session_drinks')
              .select('id, session_id, drink_id, quantity, total_price, created_at, drinks(name, price)'), ctx)
              .in('session_id', sessionBatch)
            const sessionToShift: Record<string, string> = {}
            ;(sessionsForDrinks || []).forEach((s: any) => { sessionToShift[s.id] = s.shift_id })
            ;(data || []).forEach((d: any) => { allSessionDrinks.push({ ...d, shift_id: sessionToShift[d.session_id] }) })
          }
        }
      }

      const drinkMap = new Map<string, { name: string; totalQuantity: number; totalRevenue: number }>()
      const processDrinkItem = (item: any) => {
        const name = item.drinks?.name || 'Unknown'
        const existing = drinkMap.get(name) || { name, totalQuantity: 0, totalRevenue: 0 }
        existing.totalQuantity += item.quantity || 1
        existing.totalRevenue += item.total_price || 0
        drinkMap.set(name, existing)
      }
      allDrinkSales.forEach(processDrinkItem)
      allSessionDrinks.forEach(processDrinkItem)
      const topDrinks = Array.from(drinkMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

      const dayMap = new Map<string, { date: string; revenue: number; quantity: number }>()
      const processDayItem = (item: any) => {
        const dayKey = getWorkingDayKey(item.created_at)
        const existing = dayMap.get(dayKey) || { date: dayKey, revenue: 0, quantity: 0 }
        existing.revenue += item.total_price || 0
        existing.quantity += item.quantity || 1
        dayMap.set(dayKey, existing)
      }
      allDrinkSales.forEach(processDayItem)
      allSessionDrinks.forEach(processDayItem)
      const drinksByDay = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

      const cashierDrinkMap = new Map<string, { cashier_id: string; cashier_name: string; totalRevenue: number; totalQuantity: number }>()
      allDrinkSales.forEach((sale: any) => {
        const s = fmtShifts.find((sh: any) => sh.id === sale.shift_id)
        if (!s) return
        const existing = cashierDrinkMap.get(s.cashier_id) || { cashier_id: s.cashier_id, cashier_name: s.cashier_name, totalRevenue: 0, totalQuantity: 0 }
        existing.totalRevenue += sale.total_price || 0
        existing.totalQuantity += sale.quantity || 1
        cashierDrinkMap.set(s.cashier_id, existing)
      })
      allSessionDrinks.forEach((item: any) => {
        const s = fmtShifts.find((sh: any) => sh.id === item.shift_id)
        if (!s) return
        const existing = cashierDrinkMap.get(s.cashier_id) || { cashier_id: s.cashier_id, cashier_name: s.cashier_name, totalRevenue: 0, totalQuantity: 0 }
        existing.totalRevenue += item.total_price || 0
        existing.totalQuantity += item.quantity || 1
        cashierDrinkMap.set(s.cashier_id, existing)
      })
      const drinksByCashier = Array.from(cashierDrinkMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

      drinkAnalytics = { topDrinks, drinksByDay, drinksByCashier }
    }

    // Previous period chart data
    const prevChartData = prevFmtShifts.length > 0 ? (() => {
      const dayMap = new Map<string, { revenue: number; cash: number; kaspi: number; sessions: number }>()
      prevFmtShifts.forEach((s: any) => {
        const dayKey = getWorkingDayKey(s.started_at)
        const existing = dayMap.get(dayKey) || { revenue: 0, cash: 0, kaspi: 0, sessions: 0 }
        existing.revenue += s.total_cash + s.total_kaspi
        existing.cash += s.total_cash
        existing.kaspi += s.total_kaspi
        existing.sessions += s.sessions_count
        dayMap.set(dayKey, existing)
      })
      return Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({ date, ...data }))
    })() : []

    // Zone analytics
    let zoneAnalytics: any = { zones: [], zonesByDay: [] }
    if (shiftIds.length > 0) {
      let allSessions: any[] = []
      for (let i = 0; i < shiftIds.length; i += 100) {
        const batch = shiftIds.slice(i, i + 100)
        let offset = 0
        while (true) {
          const { data } = await tenantFilter(supabase.from('sessions')
            .select('id, shift_id, game_cost, controller_cost, drink_cost, total_cost, started_at, stations(zone, name)'), ctx)
            .in('shift_id', batch).eq('status', 'completed').range(offset, offset + 999)
          allSessions = allSessions.concat(data || [])
          if (!data || data.length < 1000) break
          offset += 1000
        }
      }

      const zoneMap = new Map<string, { zone: string; sessions: number; revenue: number; gameCost: number; controllerCost: number; drinkCost: number; avgCheck: number }>()
      allSessions.forEach((s: any) => {
        const zone = s.stations?.zone || 'unknown'
        const existing = zoneMap.get(zone) || { zone, sessions: 0, revenue: 0, gameCost: 0, controllerCost: 0, drinkCost: 0, avgCheck: 0 }
        existing.sessions += 1; existing.revenue += s.total_cost || 0
        existing.gameCost += s.game_cost || 0; existing.controllerCost += s.controller_cost || 0; existing.drinkCost += s.drink_cost || 0
        zoneMap.set(zone, existing)
      })
      zoneMap.forEach(z => { z.avgCheck = z.sessions > 0 ? Math.round(z.revenue / z.sessions) : 0 })
      const zones = Array.from(zoneMap.values()).sort((a, b) => b.revenue - a.revenue)

      const zoneDayMap = new Map<string, { date: string; vip: number; hall: number }>()
      allSessions.forEach((s: any) => {
        const dayKey = getWorkingDayKey(s.started_at)
        const zone = s.stations?.zone || 'unknown'
        const existing = zoneDayMap.get(dayKey) || { date: dayKey, vip: 0, hall: 0 }
        if (zone === 'vip') existing.vip += s.total_cost || 0; else existing.hall += s.total_cost || 0
        zoneDayMap.set(dayKey, existing)
      })
      const zonesByDay = Array.from(zoneDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      zoneAnalytics = { zones, zonesByDay }
    }

    // Discount analytics
    let discountAnalytics: any = { totalDiscounts: 0, totalDiscountAmount: 0, avgDiscountPercent: 0, discountsByCashier: [], discountsByDay: [] }
    if (shiftIds.length > 0) {
      let allPayments: any[] = []
      for (let i = 0; i < shiftIds.length; i += 100) {
        const batch = shiftIds.slice(i, i + 100)
        let offset = 0
        while (true) {
          const { data } = await tenantFilter(supabase.from('payments')
            .select('id, shift_id, session_id, discount_percent, discount_amount, total_amount, created_at'), ctx)
            .in('shift_id', batch).gt('discount_percent', 0).range(offset, offset + 999)
          allPayments = allPayments.concat(data || [])
          if (!data || data.length < 1000) break
          offset += 1000
        }
      }

      const totalDiscounts = allPayments.length
      const totalDiscountAmount = allPayments.reduce((sum: number, p: any) => sum + (p.discount_amount || 0), 0)
      const avgDiscountPercent = totalDiscounts > 0
        ? Math.round(allPayments.reduce((sum: number, p: any) => sum + (p.discount_percent || 0), 0) / totalDiscounts) : 0

      const cashierDiscountMap = new Map<string, { cashier_id: string; cashier_name: string; count: number; totalAmount: number; avgPercent: number; percentSum: number }>()
      allPayments.forEach((p: any) => {
        const s = fmtShifts.find((sh: any) => sh.id === p.shift_id)
        if (!s) return
        const existing = cashierDiscountMap.get(s.cashier_id) || { cashier_id: s.cashier_id, cashier_name: s.cashier_name, count: 0, totalAmount: 0, avgPercent: 0, percentSum: 0 }
        existing.count += 1; existing.totalAmount += p.discount_amount || 0; existing.percentSum += p.discount_percent || 0
        cashierDiscountMap.set(s.cashier_id, existing)
      })
      cashierDiscountMap.forEach(c => { c.avgPercent = c.count > 0 ? Math.round(c.percentSum / c.count) : 0 })
      const discountsByCashier = Array.from(cashierDiscountMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

      const discountDayMap = new Map<string, { date: string; count: number; amount: number }>()
      allPayments.forEach((p: any) => {
        const dayKey = getWorkingDayKey(p.created_at)
        const existing = discountDayMap.get(dayKey) || { date: dayKey, count: 0, amount: 0 }
        existing.count += 1; existing.amount += p.discount_amount || 0
        discountDayMap.set(dayKey, existing)
      })
      const discountsByDay = Array.from(discountDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
      discountAnalytics = { totalDiscounts, totalDiscountAmount, avgDiscountPercent, discountsByCashier, discountsByDay }
    }

    return jsonResponse({
      shifts: fmtShifts, cashiers: filteredCashiers, totals, previousPeriodTotals,
      drinkAnalytics, prevChartData, zoneAnalytics, discountAnalytics,
    }, cors)
  } catch (err) {
    console.error('Analytics error:', err)
    return errorResponse('Failed to fetch analytics', cors, 500)
  }
}

async function handleAdminActiveSessions(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  const { data: sessions, error } = await tenantFilter(
    supabase.from('sessions').select(`id, station_id, shift_id, tariff_type, started_at, status,
      station:stations(id, name, zone, station_number, hourly_rate, package_rate),
      shift:shifts(id, cashier_id, is_active, cashier:users!shifts_cashier_id_fkey(id, name))`), ctx
  ).eq('status', 'active').order('started_at', { ascending: true })

  if (error) return errorResponse('Ошибка загрузки сессий', cors, 500)

  const sessionsWithCost = await Promise.all((sessions || []).map(async (session: any) => {
    const now = new Date()
    const startedAt = new Date(session.started_at)
    const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

    let gameCost = 0
    if (session.tariff_type === 'package') {
      gameCost = session.station?.package_rate || 0
    } else {
      gameCost = Math.ceil(elapsedMinutes / 60) * (session.station?.hourly_rate || 0)
    }

    const { data: controllers } = await tenantFilter(supabase.from('controller_usage').select('*'), ctx).eq('session_id', session.id)
    let controllerCost = 0
    for (const c of (controllers || [])) {
      const takenAt = new Date(c.taken_at)
      const returnedAt = c.returned_at ? new Date(c.returned_at) : now
      const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
      controllerCost += Math.ceil(mins / 60) * 600
    }

    const { data: drinks } = await tenantFilter(supabase.from('session_drinks').select('total_price'), ctx).eq('session_id', session.id)
    const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)

    return {
      ...session, cashier_name: session.shift?.cashier?.name || 'Unknown',
      shift_is_active: session.shift?.is_active || false, elapsed_minutes: elapsedMinutes,
      game_cost: gameCost, controller_cost: controllerCost, drink_cost: drinkCost,
      total_cost: gameCost + controllerCost + drinkCost,
      controllers_count: (controllers || []).filter((c: any) => !c.returned_at).length,
    }
  }))

  return jsonResponse(sessionsWithCost, cors)
}

async function handleAdminForceCloseSession(ctx: Ctx): Promise<Response> {
  const { supabase, cors, req } = ctx
  const body = await req.json()

  if (!body.session_id || !isValidUUID(body.session_id)) return errorResponse('Invalid session_id', cors)
  if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) return errorResponse('Invalid payment_method', cors)

  const { data: session, error: sessionError } = await tenantFilter(
    supabase.from('sessions').select('*, station:stations(*), shift:shifts(*)'), ctx
  ).eq('id', body.session_id).eq('status', 'active').single()
  if (sessionError || !session) return errorResponse('Сессия не найдена или уже завершена', cors, 404)

  const now = new Date()
  const startedAt = new Date(session.started_at)
  const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

  let gameCost = 0
  if (session.tariff_type === 'package') {
    gameCost = session.station?.package_rate || 0
  } else {
    gameCost = Math.ceil(elapsedMinutes / 60) * (session.station?.hourly_rate || 0)
  }

  const { data: controllers } = await tenantFilter(supabase.from('controller_usage').select('*'), ctx).eq('session_id', session.id)
  let controllerCost = 0
  for (const c of (controllers || [])) {
    const takenAt = new Date(c.taken_at)
    const returnedAt = c.returned_at ? new Date(c.returned_at) : now
    const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
    controllerCost += Math.ceil(mins / 60) * 600
  }

  const activeControllers = (controllers || []).filter((c: any) => !c.returned_at)
  for (const c of activeControllers) {
    const takenAt = new Date(c.taken_at)
    const mins = Math.floor((now.getTime() - takenAt.getTime()) / 60000)
    const cost = Math.ceil(mins / 60) * 600
    await tenantFilter(supabase.from('controller_usage').update({ returned_at: now.toISOString(), cost }), ctx).eq('id', c.id)
  }

  const { data: drinks } = await tenantFilter(supabase.from('session_drinks').select('total_price'), ctx).eq('session_id', session.id)
  const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)
  const totalCost = gameCost + controllerCost + drinkCost

  let cashAmount = 0, kaspiAmount = 0
  if (body.payment_method === 'cash') { cashAmount = totalCost }
  else if (body.payment_method === 'kaspi') { kaspiAmount = totalCost }
  else { cashAmount = body.cash_amount || 0; kaspiAmount = body.kaspi_amount || 0 }

  await tenantFilter(supabase.from('sessions').update({
    status: 'completed', ended_at: now.toISOString(),
    game_cost: gameCost, controller_cost: controllerCost, drink_cost: drinkCost, total_cost: totalCost,
  }), ctx).eq('id', session.id)

  await supabase.from('payments').insert(withTenant({
    session_id: session.id, shift_id: session.shift_id, payment_method: body.payment_method,
    cash_amount: cashAmount, kaspi_amount: kaspiAmount, total_amount: totalCost,
  }, ctx))

  await supabase.rpc('increment_shift_totals', {
    p_shift_id: session.shift_id,
    p_cash: cashAmount,
    p_kaspi: kaspiAmount,
    p_games: gameCost,
    p_controllers: controllerCost,
    p_drinks: drinkCost,
  })

  return jsonResponse({
    success: true, session_id: session.id, total_cost: totalCost,
    game_cost: gameCost, controller_cost: controllerCost, drink_cost: drinkCost,
  }, cors)
}

async function handleAdminCompletedSessions(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: sessions, error } = await tenantFilter(
    supabase.from('sessions').select(`id, station_id, shift_id, tariff_type, started_at, ended_at, status,
      game_cost, controller_cost, drink_cost, total_cost, package_count,
      station:stations(id, name, zone, station_number),
      shift:shifts(id, cashier_id, cashier:users!shifts_cashier_id_fkey(id, name))`), ctx
  ).eq('status', 'completed').gte('ended_at', sevenDaysAgo.toISOString())
    .order('ended_at', { ascending: false }).limit(100)

  if (error) return errorResponse('Ошибка загрузки сессий', cors, 500)

  const sessionIds = (sessions || []).map((s: any) => s.id)
  const { data: payments } = await tenantFilter(supabase.from('payments')
    .select('session_id, payment_method, cash_amount, kaspi_amount, total_amount'), ctx).in('session_id', sessionIds)
  const paymentMap = new Map((payments || []).map((p: any) => [p.session_id, p]))

  const { data: controllers } = await tenantFilter(supabase.from('controller_usage')
    .select('id, session_id, taken_at, returned_at, cost'), ctx).in('session_id', sessionIds)
  const controllerMap = new Map<string, any[]>()
  for (const c of (controllers || [])) {
    if (!controllerMap.has(c.session_id)) controllerMap.set(c.session_id, [])
    controllerMap.get(c.session_id)!.push(c)
  }

  const result = (sessions || []).map((session: any) => {
    const payment = paymentMap.get(session.id)
    return {
      ...session,
      cashier_name: session.shift?.cashier?.name || 'Unknown',
      payment_method: payment?.payment_method || null,
      cash_amount: payment?.cash_amount || 0,
      kaspi_amount: payment?.kaspi_amount || 0,
      payment_total: payment?.total_amount || 0,
      controllers: controllerMap.get(session.id) || [],
    }
  })

  return jsonResponse(result, cors)
}

async function handleAdminDrinkSales(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await tenantFilter(
    supabase.from('drink_sales').select(`id, shift_id, drink_id, quantity, total_price, payment_method, cash_amount, kaspi_amount, created_at,
      drink:drinks(id, name, price),
      shift:shifts(id, cashier_id, cashiers(id, name))`), ctx
  ).gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false }).limit(100)

  if (error) return errorResponse('Ошибка загрузки продаж', cors, 500)

  const result = (data || []).map((sale: any) => ({
    ...sale, cashier_name: sale.shift?.cashier?.name || 'Unknown',
  }))

  return jsonResponse(result, cors)
}

async function handleAdminAuditLog(ctx: Ctx): Promise<Response> {
  const { data: logs, error } = await tenantFilter(
    ctx.supabase.from('admin_audit_log').select('*, admin:cashiers!admin_audit_log_admin_id_fkey(id, name)'), ctx
  ).order('created_at', { ascending: false }).limit(200)

  if (error) return errorResponse('Ошибка загрузки журнала', ctx.cors, 500)

  const formattedLogs = (logs || []).map((l: any) => ({
    id: l.id, admin_id: l.admin_id, admin_name: l.admin?.name || 'Unknown',
    action_type: l.action_type, target_type: l.target_type, target_id: l.target_id,
    shift_id: l.shift_id, cashier_name: l.cashier_name, station_name: l.station_name,
    old_values: l.old_values, new_values: l.new_values, reason: l.reason, created_at: l.created_at,
  }))

  return jsonResponse(formattedLogs, ctx.cors)
}

async function handleAdminEditSession(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req, pathParts } = ctx
  const sessionId = pathParts[2]
  if (!isValidUUID(sessionId)) return errorResponse('Invalid session ID', cors)

  const body = await req.json()
  if (!body.reason || body.reason.trim().length < 5) return errorResponse('Укажите причину корректировки (минимум 5 символов)', cors)

  const { data: session, error: sessionError } = await tenantFilter(
    supabase.from('sessions').select(`id, station_id, shift_id, tariff_type, started_at, ended_at, status,
      game_cost, controller_cost, drink_cost, total_cost, package_count,
      station:stations(id, name), shift:shifts(id, cashier_id, cashiers(id, name))`), ctx
  ).eq('id', sessionId).eq('status', 'completed').single()
  if (sessionError || !session) return errorResponse('Сессия не найдена', cors, 404)

  const { data: payment } = await tenantFilter(supabase.from('payments').select('*'), ctx).eq('session_id', sessionId).single()
  if (!payment) return errorResponse('Платёж не найден', cors, 404)

  const oldGameCost = session.game_cost || 0, oldControllerCost = session.controller_cost || 0
  const oldDrinkCost = session.drink_cost || 0
  const oldCashAmount = payment.cash_amount || 0, oldKaspiAmount = payment.kaspi_amount || 0

  const newGameCost = body.game_cost ?? oldGameCost
  const newControllerCost = body.controller_cost ?? oldControllerCost
  const newDrinkCost = body.drink_cost ?? oldDrinkCost
  const newTotalCost = newGameCost + newControllerCost + newDrinkCost
  const newCashAmount = body.cash_amount ?? oldCashAmount
  const newKaspiAmount = body.kaspi_amount ?? oldKaspiAmount

  if (newCashAmount + newKaspiAmount !== newTotalCost) return errorResponse('Сумма наличных + Kaspi должна равняться итогу', cors)

  let newPaymentMethod = payment.payment_method
  if (newCashAmount > 0 && newKaspiAmount > 0) newPaymentMethod = 'split'
  else if (newCashAmount > 0) newPaymentMethod = 'cash'
  else newPaymentMethod = 'kaspi'

  await tenantFilter(supabase.from('sessions').update({ game_cost: newGameCost, controller_cost: newControllerCost, drink_cost: newDrinkCost, total_cost: newTotalCost }), ctx).eq('id', sessionId)
  await tenantFilter(supabase.from('payments').update({ payment_method: newPaymentMethod, cash_amount: newCashAmount, kaspi_amount: newKaspiAmount, total_amount: newTotalCost }), ctx).eq('session_id', sessionId)

  if (body.controllers && Array.isArray(body.controllers)) {
    for (const ctrl of body.controllers) {
      if (ctrl.id && isValidUUID(ctrl.id)) {
        const updateData: any = {}
        if (ctrl.taken_at) updateData.taken_at = ctrl.taken_at
        if (ctrl.returned_at) updateData.returned_at = ctrl.returned_at
        if (ctrl.cost !== undefined) updateData.cost = ctrl.cost
        if (Object.keys(updateData).length > 0) await tenantFilter(supabase.from('controller_usage').update(updateData), ctx).eq('id', ctrl.id)
      }
    }
  }

  const { data: shiftData } = await tenantFilter(supabase.from('shifts').select('*'), ctx).eq('id', session.shift_id).single()
  if (shiftData) {
    await tenantFilter(supabase.from('shifts').update({
      total_cash: (shiftData.total_cash || 0) - oldCashAmount + newCashAmount,
      total_kaspi: (shiftData.total_kaspi || 0) - oldKaspiAmount + newKaspiAmount,
      total_games: (shiftData.total_games || 0) - oldGameCost + newGameCost,
      total_controllers: (shiftData.total_controllers || 0) - oldControllerCost + newControllerCost,
      total_drinks: (shiftData.total_drinks || 0) - oldDrinkCost + newDrinkCost,
    }), ctx).eq('id', session.shift_id)
  }

  await supabase.from('admin_audit_log').insert(withTenant({
    admin_id: shift.cashier_id, action_type: 'edit_session', target_type: 'session', target_id: sessionId,
    shift_id: session.shift_id, cashier_name: (session as any).shift?.cashier?.name || 'Unknown',
    station_name: (session as any).station?.name || 'Unknown',
    old_values: { game_cost: oldGameCost, controller_cost: oldControllerCost, drink_cost: oldDrinkCost, total_cost: session.total_cost, cash_amount: oldCashAmount, kaspi_amount: oldKaspiAmount, payment_method: payment.payment_method },
    new_values: { game_cost: newGameCost, controller_cost: newControllerCost, drink_cost: newDrinkCost, total_cost: newTotalCost, cash_amount: newCashAmount, kaspi_amount: newKaspiAmount, payment_method: newPaymentMethod },
    reason: body.reason.trim(),
  }, ctx))

  return jsonResponse({ success: true }, cors)
}

async function handleAdminDeleteSession(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req, url, pathParts } = ctx
  const sessionId = pathParts[2]
  if (!isValidUUID(sessionId)) return errorResponse('Invalid session ID', cors)

  let reason = url.searchParams.get('reason') || ''
  if (!reason) { try { const body = await req.json(); reason = body.reason || '' } catch {} }
  if (!reason || reason.trim().length < 5) return errorResponse('Укажите причину удаления (минимум 5 символов)', cors)

  const { data: session, error: sessionError } = await tenantFilter(
    supabase.from('sessions').select(`id, station_id, shift_id, tariff_type, started_at, ended_at, status,
      game_cost, controller_cost, drink_cost, total_cost, package_count,
      station:stations(id, name), shift:shifts(id, cashier_id, cashiers(id, name))`), ctx
  ).eq('id', sessionId).eq('status', 'completed').single()
  if (sessionError || !session) return errorResponse('Сессия не найдена', cors, 404)

  const { data: payment } = await tenantFilter(supabase.from('payments').select('*'), ctx).eq('session_id', sessionId).single()
  const oldCashAmount = payment?.cash_amount || 0, oldKaspiAmount = payment?.kaspi_amount || 0
  const oldGameCost = session.game_cost || 0, oldControllerCost = session.controller_cost || 0, oldDrinkCost = session.drink_cost || 0

  await tenantFilter(supabase.from('payments').delete(), ctx).eq('session_id', sessionId)
  await tenantFilter(supabase.from('controller_usage').delete(), ctx).eq('session_id', sessionId)
  await tenantFilter(supabase.from('session_drinks').delete(), ctx).eq('session_id', sessionId)
  await tenantFilter(supabase.from('sessions').delete(), ctx).eq('id', sessionId)

  const { data: shiftData } = await tenantFilter(supabase.from('shifts').select('*'), ctx).eq('id', session.shift_id).single()
  if (shiftData) {
    await tenantFilter(supabase.from('shifts').update({
      total_cash: Math.max(0, (shiftData.total_cash || 0) - oldCashAmount),
      total_kaspi: Math.max(0, (shiftData.total_kaspi || 0) - oldKaspiAmount),
      total_games: Math.max(0, (shiftData.total_games || 0) - oldGameCost),
      total_controllers: Math.max(0, (shiftData.total_controllers || 0) - oldControllerCost),
      total_drinks: Math.max(0, (shiftData.total_drinks || 0) - oldDrinkCost),
    }), ctx).eq('id', session.shift_id)
  }

  await supabase.from('admin_audit_log').insert(withTenant({
    admin_id: shift.cashier_id, action_type: 'delete_session', target_type: 'session', target_id: sessionId,
    shift_id: session.shift_id, cashier_name: (session as any).shift?.cashier?.name || 'Unknown',
    station_name: (session as any).station?.name || 'Unknown',
    old_values: { game_cost: oldGameCost, controller_cost: oldControllerCost, drink_cost: oldDrinkCost, total_cost: session.total_cost, cash_amount: oldCashAmount, kaspi_amount: oldKaspiAmount, payment_method: payment?.payment_method },
    new_values: null, reason: reason.trim(),
  }, ctx))

  return jsonResponse({ success: true }, cors)
}

async function handleAdminDeleteDrinkSale(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req, url, pathParts } = ctx
  const saleId = pathParts[2]
  if (!isValidUUID(saleId)) return errorResponse('Invalid sale ID', cors)

  let reason = url.searchParams.get('reason') || ''
  if (!reason) { try { const body = await req.json(); reason = body.reason || '' } catch {} }
  if (!reason || reason.trim().length < 5) return errorResponse('Укажите причину удаления (минимум 5 символов)', cors)

  const { data: sale, error: saleError } = await tenantFilter(
    supabase.from('drink_sales').select(`id, shift_id, drink_id, quantity, total_price, payment_method, cash_amount, kaspi_amount, created_at,
      drink:drinks(id, name), shift:shifts(id, cashier_id, cashier:users!shifts_cashier_id_fkey(id, name))`), ctx
  ).eq('id', saleId).single()
  if (saleError || !sale) return errorResponse('Продажа не найдена', cors, 404)

  const oldCashAmount = sale.cash_amount || 0, oldKaspiAmount = sale.kaspi_amount || 0, oldTotalPrice = sale.total_price || 0

  await tenantFilter(supabase.from('drink_sales').delete(), ctx).eq('id', saleId)

  const { data: shiftData } = await tenantFilter(supabase.from('shifts').select('*'), ctx).eq('id', sale.shift_id).single()
  if (shiftData) {
    await tenantFilter(supabase.from('shifts').update({
      total_cash: Math.max(0, (shiftData.total_cash || 0) - oldCashAmount),
      total_kaspi: Math.max(0, (shiftData.total_kaspi || 0) - oldKaspiAmount),
      total_drinks: Math.max(0, (shiftData.total_drinks || 0) - oldTotalPrice),
    }), ctx).eq('id', sale.shift_id)
  }

  await supabase.from('admin_audit_log').insert(withTenant({
    admin_id: shift.cashier_id, action_type: 'delete_drink_sale', target_type: 'drink_sale', target_id: saleId,
    shift_id: sale.shift_id, cashier_name: (sale as any).shift?.cashier?.name || 'Unknown', station_name: null,
    old_values: { drink_name: (sale as any).drink?.name, quantity: sale.quantity, total_price: oldTotalPrice, payment_method: sale.payment_method, cash_amount: oldCashAmount, kaspi_amount: oldKaspiAmount, created_at: sale.created_at },
    new_values: null, reason: reason.trim(),
  }, ctx))

  return jsonResponse({ success: true }, cors)
}

async function handleAdminGetDiscountPresets(ctx: Ctx): Promise<Response> {
  const { data, error } = await tenantFilter(ctx.supabase.from('discount_presets').select('*'), ctx).order('percent')
  if (error) return errorResponse('Ошибка загрузки пресетов скидок', ctx.cors, 500)
  return jsonResponse(data, ctx.cors)
}

async function handleAdminCreateDiscountPreset(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json()
  const percent = parseInt(body.percent)
  if (isNaN(percent) || percent < 1 || percent > 100) return errorResponse('Процент должен быть от 1 до 100', ctx.cors)

  const { data, error } = await ctx.supabase.from('discount_presets').insert(withTenant({ percent }, ctx)).select().single()
  if (error) {
    if (error.code === '23505') return errorResponse('Пресет с таким процентом уже существует', ctx.cors)
    return errorResponse('Ошибка создания пресета', ctx.cors, 500)
  }
  return jsonResponse(data, ctx.cors)
}

async function handleAdminDeleteDiscountPreset(ctx: Ctx): Promise<Response> {
  const id = ctx.path.split('/')[3]
  if (!isValidUUID(id)) return errorResponse('Invalid preset ID', ctx.cors)

  const { error } = await tenantFilter(ctx.supabase.from('discount_presets').delete(), ctx).eq('id', id)
  if (error) return errorResponse('Ошибка удаления пресета', ctx.cors, 500)
  return jsonResponse({ success: true }, ctx.cors)
}

// ---- Admin: Drinks management ----
async function handleAdminCreateDrink(ctx: Ctx): Promise<Response> {
  const body = await ctx.req.json()
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) return errorResponse('Название обязательно', ctx.cors)
  if (body.name.length > 100) return errorResponse('Название слишком длинное', ctx.cors)
  if (typeof body.price !== 'number' || body.price < 0 || body.price > 1000000) return errorResponse('Некорректная цена', ctx.cors)

  const { data, error } = await ctx.supabase.from('drinks').insert(withTenant({ name: body.name.trim(), price: body.price }, ctx)).select().single()
  if (error) {
    if (error.code === '23505') return errorResponse('Напиток с таким названием уже существует', ctx.cors)
    return errorResponse('Ошибка создания напитка', ctx.cors, 500)
  }
  return jsonResponse(data, ctx.cors)
}

async function handleAdminUpdateDrink(ctx: Ctx): Promise<Response> {
  const id = ctx.pathParts[2]
  if (!isValidUUID(id)) return errorResponse('Invalid drink ID', ctx.cors)

  const body = await ctx.req.json()
  const updateData: Record<string, any> = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) return errorResponse('Название обязательно', ctx.cors)
    if (body.name.length > 100) return errorResponse('Название слишком длинное', ctx.cors)
    updateData.name = body.name.trim()
  }
  if (body.price !== undefined) {
    if (typeof body.price !== 'number' || body.price < 0 || body.price > 1000000) return errorResponse('Некорректная цена', ctx.cors)
    updateData.price = body.price
  }

  const { data, error } = await tenantFilter(ctx.supabase.from('drinks').update(updateData), ctx).eq('id', id).select().single()
  if (error) return errorResponse('Ошибка обновления напитка', ctx.cors, 500)
  return jsonResponse(data, ctx.cors)
}

async function handleAdminDeleteDrink(ctx: Ctx): Promise<Response> {
  const id = ctx.pathParts[2]
  if (!isValidUUID(id)) return errorResponse('Invalid drink ID', ctx.cors)

  const { data: activeDrinks } = await tenantFilter(
    ctx.supabase.from('session_drinks').select('id, session:sessions!inner(status)'), ctx
  ).eq('drink_id', id).eq('session.status', 'active').limit(1)
  if (activeDrinks && activeDrinks.length > 0) return errorResponse('Нельзя удалить напиток, который используется в активной сессии', ctx.cors)

  await tenantFilter(ctx.supabase.from('inventory_movements').delete(), ctx).eq('drink_id', id)
  await tenantFilter(ctx.supabase.from('inventory').delete(), ctx).eq('drink_id', id)

  const { error } = await tenantFilter(ctx.supabase.from('drinks').delete(), ctx).eq('id', id)
  if (error) return errorResponse('Ошибка удаления напитка. Возможно, он используется в истории продаж.', ctx.cors, 500)
  return jsonResponse({ success: true }, ctx.cors)
}

async function handleAdminGetInventory(ctx: Ctx): Promise<Response> {
  const { data, error } = await tenantFilter(
    ctx.supabase.from('inventory').select('*, drink:drinks(id, name, price)'), ctx
  ).order('updated_at', { ascending: false })
  if (error) return errorResponse('Ошибка загрузки инвентаря', ctx.cors, 500)
  return jsonResponse(data, ctx.cors)
}

async function handleAdminUpdateInventoryItem(ctx: Ctx): Promise<Response> {
  const id = ctx.path.split('/')[3]
  if (!isValidUUID(id)) return errorResponse('Invalid inventory ID', ctx.cors)

  const body = await ctx.req.json()
  const updateData: Record<string, any> = {}
  if (body.min_threshold !== undefined) updateData.min_threshold = body.min_threshold
  if (body.unit !== undefined) updateData.unit = body.unit

  const { data, error } = await tenantFilter(ctx.supabase.from('inventory').update(updateData), ctx).eq('id', id).select().single()
  if (error) return errorResponse('Ошибка обновления', ctx.cors, 500)
  return jsonResponse(data, ctx.cors)
}

async function handleAdminCreateInventoryMovement(ctx: Ctx): Promise<Response> {
  const { supabase, shift, cors, req } = ctx
  const body = await req.json()

  if (!body.drink_id || !isValidUUID(body.drink_id)) return errorResponse('Invalid drink_id', cors)
  if (typeof body.quantity !== 'number' || body.quantity === 0) return errorResponse('Invalid quantity', cors)
  if (!['intake', 'write_off', 'correction'].includes(body.type)) return errorResponse('Invalid type', cors)

  const quantityChange = body.type === 'write_off' ? -Math.abs(body.quantity) : body.quantity

  const { data: movement, error: movementError } = await supabase.from('inventory_movements').insert(withTenant({
    drink_id: body.drink_id, quantity_change: quantityChange, type: body.type,
    reason: body.reason || null, performed_by: shift.cashier_id, shift_id: shift.id,
  }, ctx)).select().single()
  if (movementError) return errorResponse('Ошибка создания движения', cors, 500)

  const { data: inventory } = await tenantFilter(supabase.from('inventory').select('*'), ctx).eq('drink_id', body.drink_id).single()
  if (inventory) {
    await tenantFilter(supabase.from('inventory').update({ quantity: inventory.quantity + quantityChange, updated_at: new Date().toISOString() }), ctx).eq('id', inventory.id)
  } else {
    await supabase.from('inventory').insert(withTenant({ drink_id: body.drink_id, quantity: Math.max(0, quantityChange), min_threshold: 5 }, ctx))
  }

  return jsonResponse(movement, cors)
}

async function handleAdminGetInventoryMovements(ctx: Ctx): Promise<Response> {
  const drinkId = ctx.url.searchParams.get('drink_id')
  let query = tenantFilter(
    ctx.supabase.from('inventory_movements').select('*, drink:drinks(id, name), performer:cashiers!inventory_movements_performed_by_fkey(id, name)'), ctx
  ).order('created_at', { ascending: false }).limit(100)
  if (drinkId && isValidUUID(drinkId)) query = query.eq('drink_id', drinkId)

  const { data, error } = await query
  if (error) return errorResponse('Ошибка загрузки движений', ctx.cors, 500)
  return jsonResponse(data, ctx.cors)
}
// ==================== PLATFORM HANDLERS (SUPER ADMIN) ====================

async function handlePlatformListTenants(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  
  // Get all tenants with station count
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(`
      *,
      stations!stations_tenant_id_fkey(count)
    `)
    .order('created_at', { ascending: false })
    
  if (error) return errorResponse(error.message, cors)
  
  // Format the response
  const formattedTenants = tenants.map((t: any) => {
    // Check if trial has expired to update status in response
    let effectiveStatus = t.status
    if (t.status === 'trial' && t.trial_until && new Date() > new Date(t.trial_until)) {
      effectiveStatus = 'suspended' // Automatically suspended if trial expired
    }
    
    return {
      id: t.id,
      club_name: t.club_name,
      city: t.city,
      status: effectiveStatus,
      stations_count: t.stations?.length || 0,
      trial_until: t.trial_until,
      created_at: t.created_at,
      signup_email: t.signup_email,
      signup_phone: t.signup_phone
    }
  })
  
  return jsonResponse(formattedTenants, cors)
}

async function handlePlatformCreateTenant(ctx: Ctx): Promise<Response> {
  const { supabase, req, cors, platformUser } = ctx
  const body = await req.json().catch(() => ({}))
  
  if (!body.club_name) return errorResponse('club_name required', cors)
  
  // Default to 14 days trial
  const trialDays = body.trial_days || 14
  const trialUntil = new Date()
  trialUntil.setDate(trialUntil.getDate() + trialDays)
  
  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert([{
      club_name: body.club_name,
      city: body.city,
      signup_email: body.signup_email,
      signup_phone: body.signup_phone,
      status: 'trial',
      plan: 'trial',
      trial_until: trialUntil.toISOString()
    }])
    .select()
    .single()
    
  if (error) return errorResponse(error.message, cors)
  
  // Create default club_admin
  const adminName = body.admin_name || `Admin ${body.club_name}`
  const adminEmail = body.signup_email || null
  const adminPin = body.admin_pin || '0000' // Default PIN if none provided
  
  const { error: userError } = await supabase
    .from('users')
    .insert([{
      tenant_id: tenant.id,
      name: adminName,
      email: adminEmail,
      pin_code: adminPin,
      role: 'club_admin'
    }])

  if (userError) {
    console.error('Error creating default admin:', userError)
  }
  
  return jsonResponse(tenant, cors, 201)
}

async function handlePlatformApproveTenant(ctx: Ctx): Promise<Response> {
  const { supabase, cors, pathParts, platformUser } = ctx
  const tenantId = pathParts[2]
  
  const { data, error } = await supabase
    .from('tenants')
    .update({ 
      status: 'active',
      plan: 'active',
      approved_at: new Date().toISOString(),
      approved_by: platformUser.id
    })
    .eq('id', tenantId)
    .select()
    .single()
    
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}

async function handlePlatformSuspendTenant(ctx: Ctx): Promise<Response> {
  const { supabase, cors, pathParts } = ctx
  const tenantId = pathParts[2]
  
  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'suspended' })
    .eq('id', tenantId)
    .select()
    .single()
    
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}

async function handlePlatformBlockTenant(ctx: Ctx): Promise<Response> {
  const { supabase, cors, pathParts } = ctx
  const tenantId = pathParts[2]
  
  const { data, error } = await supabase
    .from('tenants')
    .update({ status: 'blocked' })
    .eq('id', tenantId)
    .select()
    .single()
    
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}

async function handlePlatformExtendTrial(ctx: Ctx): Promise<Response> {
  const { supabase, req, cors, pathParts } = ctx
  const tenantId = pathParts[2]
  const body = await req.json().catch(() => ({}))
  
  const days = body.days || 14
  
  // Get current tenant
  const { data: tenant } = await supabase.from('tenants').select('trial_until').eq('id', tenantId).single()
  if (!tenant) return errorResponse('Tenant not found', cors, 404)
  
  // Calculate new date
  let baseDate = new Date()
  if (tenant.trial_until && new Date(tenant.trial_until) > new Date()) {
    baseDate = new Date(tenant.trial_until)
  }
  
  baseDate.setDate(baseDate.getDate() + days)
  
  const { data, error } = await supabase
    .from('tenants')
    .update({ 
      trial_until: baseDate.toISOString(),
      status: 'trial' // Ensure it's back in trial status
    })
    .eq('id', tenantId)
    .select()
    .single()
    
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}


// ==================== SETUP (Club Wizard) ====================
async function handleSetupClub(ctx: Ctx): Promise<Response> {
  const { supabase, cors, tenant_id } = ctx
  if (!tenant_id) return errorResponse('tenant_id required', cors, 400)

  const body = await ctx.req.json()
  const { stations, drinks, packages } = body

  if (!Array.isArray(stations) || stations.length === 0) {
    return errorResponse('stations array is required', cors, 400)
  }

  // Validate stations
  for (const s of stations) {
    if (!s.name || typeof s.name !== 'string') return errorResponse('Each station must have a name', cors, 400)
    if (!s.zone || !['vip', 'hall'].includes(s.zone)) return errorResponse('Invalid zone', cors, 400)
    if (typeof s.station_number !== 'number') return errorResponse('station_number required', cors, 400)
    if (typeof s.hourly_rate !== 'number' || s.hourly_rate < 0) return errorResponse('Invalid hourly_rate', cors, 400)
    if (typeof s.package_rate !== 'number' || s.package_rate < 0) return errorResponse('Invalid package_rate', cors, 400)
  }

  // Check that no stations exist yet (wizard should only run once)
  const { count } = await supabase.from('stations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant_id)
  if (count && count > 0) return errorResponse('Станции уже созданы', cors, 400)

  // Insert stations
  const stationRows = stations.map((s: any) => ({
    name: s.name,
    zone: s.zone,
    station_number: s.station_number,
    hourly_rate: s.hourly_rate,
    package_rate: s.package_rate,
    tenant_id,
  }))

  const { data: createdStations, error: stErr } = await supabase.from('stations').insert(stationRows).select()
  if (stErr) return errorResponse(stErr.message, cors)

  // Insert package presets
  let createdPackages: any[] = []
  if (Array.isArray(packages) && packages.length > 0) {
    const pkgRows = packages
      .filter((p: any) => p.name && typeof p.duration_hours === 'number' && p.duration_hours > 0)
      .map((p: any) => ({ name: p.name.trim(), duration_hours: p.duration_hours, tenant_id }))

    if (pkgRows.length > 0) {
      const { data, error: pkgErr } = await supabase.from('package_presets').insert(pkgRows).select()
      if (pkgErr) return errorResponse(pkgErr.message, cors)
      createdPackages = data || []
    }
  }

  // Insert drinks if provided
  let createdDrinks: any[] = []
  if (Array.isArray(drinks) && drinks.length > 0) {
    const drinkRows = drinks
      .filter((d: any) => d.name && typeof d.price === 'number' && d.price >= 0)
      .map((d: any) => ({ name: d.name.trim(), price: d.price, tenant_id }))
    
    if (drinkRows.length > 0) {
      const { data, error: drErr } = await supabase.from('drinks').insert(drinkRows).select()
      if (drErr) return errorResponse(drErr.message, cors)
      createdDrinks = data || []
    }
  }

  return jsonResponse({ stations: createdStations, packages: createdPackages, drinks: createdDrinks }, cors, 201)
}

// ==================== ADMIN: STATIONS ====================
async function handleAdminGetStations(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  const { data, error } = await tenantFilter(supabase.from('stations').select('*'), ctx).order('station_number')
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}

async function handleAdminCreateStation(ctx: Ctx): Promise<Response> {
  const { supabase, cors } = ctx
  const body = await ctx.req.json()
  if (!body.name || !body.zone || typeof body.station_number !== 'number' || typeof body.hourly_rate !== 'number' || typeof body.package_rate !== 'number') {
    return errorResponse('Missing required fields', cors, 400)
  }
  if (!['vip', 'hall'].includes(body.zone)) return errorResponse('Invalid zone', cors, 400)
  const { data, error } = await supabase.from('stations').insert(withTenant({
    name: body.name.trim(), zone: body.zone, station_number: body.station_number,
    hourly_rate: body.hourly_rate, package_rate: body.package_rate,
  }, ctx)).select().single()
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors, 201)
}

async function handleAdminUpdateStation(ctx: Ctx): Promise<Response> {
  const { supabase, cors, pathParts } = ctx
  const stationId = pathParts[2]
  if (!isValidUUID(stationId)) return errorResponse('Invalid station id', cors, 400)
  const body = await ctx.req.json()
  const updates: Record<string, any> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.zone !== undefined) {
    if (!['vip', 'hall'].includes(body.zone)) return errorResponse('Invalid zone', cors, 400)
    updates.zone = body.zone
  }
  if (body.station_number !== undefined) updates.station_number = body.station_number
  if (body.hourly_rate !== undefined) updates.hourly_rate = body.hourly_rate
  if (body.package_rate !== undefined) updates.package_rate = body.package_rate
  if (Object.keys(updates).length === 0) return errorResponse('Nothing to update', cors, 400)
  const { data, error } = await tenantFilter(supabase.from('stations').update(updates), ctx)
    .eq('id', stationId).select().single()
  if (error) return errorResponse(error.message, cors)
  return jsonResponse(data, cors)
}

async function handleAdminDeleteStation(ctx: Ctx): Promise<Response> {
  const { supabase, cors, pathParts } = ctx
  const stationId = pathParts[2]
  if (!isValidUUID(stationId)) return errorResponse('Invalid station id', cors, 400)
  const { count } = await tenantFilter(supabase.from('sessions').select('id', { count: 'exact', head: true }), ctx)
    .eq('station_id', stationId).eq('status', 'active')
  if (count && count > 0) return errorResponse('Нельзя удалить станцию с активной сессией', cors, 400)
  const { error } = await tenantFilter(supabase.from('stations').delete(), ctx).eq('id', stationId)
  if (error) return errorResponse(error.message, cors)
  return jsonResponse({ success: true }, cors)
}

// ==================== MAIN ROUTER ====================
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const path = url.pathname.replace('/api', '')
    const method = req.method
    const pathParts = path.split('/').filter(Boolean)

    // Platform routes (Super Admin)
    if (path.startsWith('/platform/')) {
      const platformUser = await authenticatePlatformOwner(supabase, req)
      if (!platformUser) return errorResponse('Unauthorized', corsHeaders, 401)
      
      const ctx: Ctx = { req, supabase, platformUser, url, cors: corsHeaders, path, method, pathParts }
      
      if (path === '/platform/tenants' && method === 'GET') return await handlePlatformListTenants(ctx)
      if (path === '/platform/tenants' && method === 'POST') return await handlePlatformCreateTenant(ctx)
      if (pathParts.length === 4 && pathParts[1] === 'tenants' && pathParts[3] === 'approve' && method === 'PATCH') return await handlePlatformApproveTenant(ctx)
      if (pathParts.length === 4 && pathParts[1] === 'tenants' && pathParts[3] === 'suspend' && method === 'PATCH') return await handlePlatformSuspendTenant(ctx)
      if (pathParts.length === 4 && pathParts[1] === 'tenants' && pathParts[3] === 'block' && method === 'PATCH') return await handlePlatformBlockTenant(ctx)
      if (pathParts.length === 4 && pathParts[1] === 'tenants' && pathParts[3] === 'extend-trial' && method === 'PATCH') return await handlePlatformExtendTrial(ctx)

      return errorResponse('Platform route not found', corsHeaders, 404)
    }

    // Cashier & Admin routes
    const sessionToken = req.headers.get('x-session-token')
    const shift = await authenticateSession(supabase, sessionToken)

    if (!shift) {
      return errorResponse('Unauthorized', corsHeaders, 401)
    }

    const tenant_id = shift.tenant_id
    if (!tenant_id) return errorResponse('Tenant context missing', corsHeaders, 403)
    
    // Check if tenant is active
    const { data: tenant } = await supabase.from('tenants').select('status, trial_until').eq('id', tenant_id).single()
    if (!tenant) return errorResponse('Tenant not found', corsHeaders, 404)
    
    if (tenant.status === 'blocked') return errorResponse('Аккаунт заблокирован', corsHeaders, 403)
    if (tenant.status === 'suspended') return errorResponse('Аккаунт приостановлен', corsHeaders, 403)
    if (tenant.status === 'trial' && tenant.trial_until && new Date() > new Date(tenant.trial_until)) {
      return errorResponse('Аккаунт приостановлен (пробный период истёк)', corsHeaders, 403)
    }

    const ctx: Ctx = { req, supabase, shift, tenant_id, url, cors: corsHeaders, path, method, pathParts }

    // ---- Cashier routes ----
    if (path === '/setup' && method === 'POST') return await handleSetupClub(ctx)
    if (path === '/stations' && method === 'GET') return await handleGetStations(ctx)
    if (path.match(/^\/stations\/[0-9a-f-]+$/) && method === 'GET') return await handleGetSingleStation(ctx)
    if (path === '/drinks' && method === 'GET') return await handleGetDrinks(ctx)
    if (path === '/reservations' && method === 'GET') return await handleGetReservations(ctx)
    if (path === '/bookings' && method === 'GET') return await handleGetBookings(ctx)
    if (path === '/sessions' && method === 'POST') return await handleCreateSession(ctx)
    if (path.match(/^\/sessions\/[^/]+\/extend-package$/) && method === 'POST') return await handleExtendPackage(ctx)
    if (path.match(/^\/sessions\/[^/]+$/) && method === 'GET') return await handleGetSession(ctx)
    if (path.match(/^\/sessions\/[^/]+$/) && method === 'PATCH') return await handleUpdateSession(ctx)
    if (path === '/discount-presets' && method === 'GET') return await handleGetDiscountPresets(ctx)
    if (path === '/payments' && method === 'POST') return await handleCreatePayment(ctx)
    if (path === '/controller-usage' && method === 'POST') return await handleCreateControllerUsage(ctx)
    if (path.startsWith('/controller-usage/') && method === 'PATCH') return await handleUpdateControllerUsage(ctx)
    if (path === '/session-drinks' && method === 'POST') return await handleAddSessionDrink(ctx)
    if (path.match(/^\/session-drinks\/[^/]+$/) && method === 'DELETE') return await handleDeleteSessionDrink(ctx)
    if (path === '/drink-sales' && method === 'POST') return await handleCreateDrinkSale(ctx)
    if (path === '/reservations' && method === 'POST') return await handleCreateReservation(ctx)
    if (path.startsWith('/reservations/') && method === 'PATCH') return await handleUpdateReservation(ctx)
    if (path === '/bookings' && method === 'POST') return await handleCreateBooking(ctx)
    if (path.startsWith('/bookings/') && method === 'PATCH') return await handleUpdateBooking(ctx)
    if (path === '/shift' && method === 'GET') return await handleGetShift(ctx)
    if (path === '/shift/report' && method === 'GET') return await handleGetShiftReport(ctx)
    if (path === '/shift/history' && method === 'GET') return await handleGetShiftHistory(ctx)

    // ---- Admin routes (require admin role) ----
    if (path.startsWith('/admin/')) {
      const userRole = await getUserRole(supabase, shift.cashier_id)
      if (userRole !== 'admin') return errorResponse('Доступ запрещён', corsHeaders, 403)

      if (path === '/admin/cashiers' && method === 'GET') return await handleAdminGetCashiers(ctx)
      if (path === '/admin/cashiers' && method === 'POST') return await handleAdminCreateCashier(ctx)
      if (path.startsWith('/admin/cashiers/') && method === 'PATCH') return await handleAdminUpdateCashier(ctx)
      if (path.startsWith('/admin/cashiers/') && method === 'DELETE') return await handleAdminDeleteCashier(ctx)
      if (path === '/admin/shifts-analytics' && method === 'GET') return await handleAdminShiftsAnalytics(ctx)
      if (path === '/admin/active-sessions' && method === 'GET') return await handleAdminActiveSessions(ctx)
      if (path === '/admin/force-close-session' && method === 'POST') return await handleAdminForceCloseSession(ctx)
      if (path === '/admin/completed-sessions' && method === 'GET') return await handleAdminCompletedSessions(ctx)
      if (path === '/admin/drink-sales' && method === 'GET') return await handleAdminDrinkSales(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'drink-sales' && method === 'DELETE') return await handleAdminDeleteDrinkSale(ctx)
      if (path === '/admin/audit-log' && method === 'GET') return await handleAdminAuditLog(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'sessions' && method === 'PATCH') return await handleAdminEditSession(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'sessions' && method === 'DELETE') return await handleAdminDeleteSession(ctx)
      if (path === '/admin/discount-presets' && method === 'GET') return await handleAdminGetDiscountPresets(ctx)
      if (path === '/admin/discount-presets' && method === 'POST') return await handleAdminCreateDiscountPreset(ctx)
      if (path.startsWith('/admin/discount-presets/') && method === 'DELETE') return await handleAdminDeleteDiscountPreset(ctx)
      if (path === '/admin/drinks' && method === 'POST') return await handleAdminCreateDrink(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'drinks' && method === 'PATCH') return await handleAdminUpdateDrink(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'drinks' && method === 'DELETE') return await handleAdminDeleteDrink(ctx)
      if (path === '/admin/inventory' && method === 'GET') return await handleAdminGetInventory(ctx)
      if (path.startsWith('/admin/inventory/') && pathParts[2] !== 'movement' && pathParts[2] !== 'movements' && method === 'PATCH') return await handleAdminUpdateInventoryItem(ctx)
      if (path === '/admin/inventory/movement' && method === 'POST') return await handleAdminCreateInventoryMovement(ctx)
      if (path === '/admin/inventory/movements' || (path.startsWith('/admin/inventory/movements') && method === 'GET')) return await handleAdminGetInventoryMovements(ctx)
      if (path === '/admin/stations' && method === 'GET') return await handleAdminGetStations(ctx)
      if (path === '/admin/stations' && method === 'POST') return await handleAdminCreateStation(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'stations' && method === 'PATCH') return await handleAdminUpdateStation(ctx)
      if (pathParts.length === 3 && pathParts[1] === 'stations' && method === 'DELETE') return await handleAdminDeleteStation(ctx)
    }

    return errorResponse('Not found', corsHeaders, 404)
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    )
  }
})
