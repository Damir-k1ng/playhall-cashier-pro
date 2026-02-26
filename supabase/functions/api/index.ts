import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allow all lovable.app and lovableproject.com origins dynamically
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  // Allow any lovable.app subdomain
  if (origin.includes('.lovable.app')) return true
  
  // Allow any lovableproject.com subdomain
  if (origin.includes('.lovableproject.com')) return true
  
  // Allow localhost for development
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

// Input validation helpers
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

function validatePayment(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) {
    return { valid: false, error: 'Invalid session_id' }
  }
  if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) {
    return { valid: false, error: 'Invalid payment_method' }
  }
  if (typeof body.total_amount !== 'number' || body.total_amount < 0) {
    return { valid: false, error: 'Invalid total_amount' }
  }
  if (body.cash_amount !== undefined && (typeof body.cash_amount !== 'number' || body.cash_amount < 0)) {
    return { valid: false, error: 'Invalid cash_amount' }
  }
  if (body.kaspi_amount !== undefined && (typeof body.kaspi_amount !== 'number' || body.kaspi_amount < 0)) {
    return { valid: false, error: 'Invalid kaspi_amount' }
  }
  return { valid: true }
}

function validateSession(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) {
    return { valid: false, error: 'Invalid station_id' }
  }
  if (!['hourly', 'package'].includes(body.tariff_type)) {
    return { valid: false, error: 'Invalid tariff_type' }
  }
  return { valid: true }
}

function validateReservation(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) {
    return { valid: false, error: 'Invalid station_id' }
  }
  if (!body.reserved_for) {
    return { valid: false, error: 'Invalid reserved_for' }
  }
  if (body.customer_name && body.customer_name.length > 100) {
    return { valid: false, error: 'customer_name too long' }
  }
  if (body.phone && !/^[0-9+\-\s()]+$/.test(body.phone)) {
    return { valid: false, error: 'Invalid phone format' }
  }
  return { valid: true }
}

function validateBooking(body: any): { valid: boolean; error?: string } {
  if (!body.station_id || !isValidUUID(body.station_id)) {
    return { valid: false, error: 'Invalid station_id' }
  }
  if (!body.start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time)) {
    return { valid: false, error: 'Invalid start_time format' }
  }
  if (body.comment && body.comment.length > 200) {
    return { valid: false, error: 'comment too long' }
  }
  return { valid: true }
}

function validateControllerUsage(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) {
    return { valid: false, error: 'Invalid session_id' }
  }
  return { valid: true }
}

function validateSessionDrink(body: any): { valid: boolean; error?: string } {
  if (!body.session_id || !isValidUUID(body.session_id)) {
    return { valid: false, error: 'Invalid session_id' }
  }
  if (!body.drink_id || !isValidUUID(body.drink_id)) {
    return { valid: false, error: 'Invalid drink_id' }
  }
  if (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 100) {
    return { valid: false, error: 'Invalid quantity' }
  }
  if (typeof body.total_price !== 'number' || body.total_price < 0) {
    return { valid: false, error: 'Invalid total_price' }
  }
  return { valid: true }
}

function validateDrinkSale(body: any): { valid: boolean; error?: string } {
  if (!body.drink_id || !isValidUUID(body.drink_id)) {
    return { valid: false, error: 'Invalid drink_id' }
  }
  if (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 100) {
    return { valid: false, error: 'Invalid quantity' }
  }
  if (typeof body.total_price !== 'number' || body.total_price < 0) {
    return { valid: false, error: 'Invalid total_price' }
  }
  if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) {
    return { valid: false, error: 'Invalid payment_method' }
  }
  return { valid: true }
}

function validateCashier(body: any): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return { valid: false, error: 'Имя обязательно' }
  }
  if (body.name.length > 50) {
    return { valid: false, error: 'Имя слишком длинное' }
  }
  if (!body.pin || typeof body.pin !== 'string' || !/^\d{4}$/.test(body.pin)) {
    return { valid: false, error: 'PIN должен содержать 4 цифры' }
  }
  return { valid: true }
}

async function getUserRole(supabase: any, cashierId: string): Promise<string> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('cashier_id', cashierId)
    .single()
  return data?.role || 'cashier'
}

async function authenticateSession(supabase: any, sessionToken: string | null) {
  if (!sessionToken) return null

  const { data: shift } = await supabase
    .from('shifts')
    .select('*, cashiers(*)')
    .eq('session_token', sessionToken)
    .eq('is_active', true)
    .single()

  return shift
}

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

    const sessionToken = req.headers.get('x-session-token')
    const shift = await authenticateSession(supabase, sessionToken)

    if (!shift) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/api', '')
    const method = req.method

    // Route handlers
    // GET /stations - Get all stations with active sessions (optimized with parallel queries)
    if (path === '/stations' && method === 'GET') {
      const today = new Date().toISOString().split('T')[0]
      
      // Run all queries in parallel for better performance
      const [stationsResult, sessionsResult, reservationsResult, bookingsResult] = await Promise.all([
        supabase.from('stations').select('*').order('station_number'),
        supabase.from('sessions')
          .select('*, controller_usage(*), session_drinks(*, drinks(*))')
          .eq('status', 'active'),
        supabase.from('reservations').select('*').eq('is_active', true),
        supabase.from('bookings').select('*').eq('status', 'booked').eq('booking_date', today)
      ])

      const stations = stationsResult.data || []
      const activeSessions = sessionsResult.data || []
      const activeReservations = reservationsResult.data || []
      const activeBookings = bookingsResult.data || []

      // Create lookup maps for O(1) access instead of O(n) find operations
      const sessionMap = new Map(activeSessions.map(s => [s.station_id, s]))
      const reservationMap = new Map(activeReservations.map(r => [r.station_id, r]))
      const bookingMap = new Map(activeBookings.map(b => [b.station_id, b]))

      const stationsWithData = stations.map(station => {
        const activeSession = sessionMap.get(station.id) || null
        return {
          ...station,
          activeSession,
          activeReservation: reservationMap.get(station.id) || null,
          activeBooking: bookingMap.get(station.id) || null,
          // Flag indicating if current cashier owns this session
          isOwnSession: activeSession ? activeSession.shift_id === shift.id : null
        }
      })

      return new Response(
        JSON.stringify(stationsWithData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=2' } }
      )
    }

    // GET /drinks - Get all drinks
    if (path === '/drinks' && method === 'GET') {
      const { data } = await supabase.from('drinks').select('*').order('name')
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /reservations - Get active reservations
    if (path === '/reservations' && method === 'GET') {
      const { data } = await supabase
        .from('reservations')
        .select('*, station:stations(id, name, zone)')
        .eq('is_active', true)
        .gte('reserved_for', new Date().toISOString())
        .order('reserved_for', { ascending: true })
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /bookings - Get today's bookings
    if (path === '/bookings' && method === 'GET') {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('bookings')
        .select('*, station:stations(id, name, zone)')
        .eq('booking_date', today)
        .order('start_time', { ascending: true })
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /sessions - Create session
    if (path === '/sessions' && method === 'POST') {
      const body = await req.json()
      const validation = validateSession(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check for existing active session on this station (prevents duplicates)
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('station_id', body.station_id)
        .eq('status', 'active')
        .maybeSingle()

      if (existingSession) {
        return new Response(
          JSON.stringify({ error: 'На этой станции уже есть активная сессия' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Set package_count to 1 for package sessions
      const insertData: any = { 
        station_id: body.station_id,
        tariff_type: body.tariff_type,
        status: 'active',
        shift_id: shift.id
      }
      if (body.tariff_type === 'package') {
        insertData.package_count = 1
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Session create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to create session' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /sessions/:id - Get session with full details for payment
    if (path.startsWith('/sessions/') && method === 'GET') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid session ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: session, error } = await supabase
        .from('sessions')
        .select('*, station:stations(*)')
        .eq('id', id)
        .single()

      if (error || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get controllers and drinks for cost calculation
      const { data: controllers } = await supabase
        .from('controller_usage')
        .select('*')
        .eq('session_id', id)

      const { data: drinks } = await supabase
        .from('session_drinks')
        .select('*, drink:drinks(*)')
        .eq('session_id', id)

      // Calculate costs
      const now = new Date()
      const startedAt = new Date(session.started_at)
      const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

      // Game cost calculation - account for package_count
      let gameCost = 0
      const packageCount = session.package_count || 1
      const packageDurationMinutes = 180 * packageCount // 3 hours per package
      
      if (session.tariff_type === 'package') {
        // Base cost is package_rate * number of packages
        gameCost = (session.station?.package_rate || 0) * packageCount
        
        // Add overtime cost if elapsed time exceeds total package duration
        if (elapsedMinutes > packageDurationMinutes) {
          const overtimeMinutes = elapsedMinutes - packageDurationMinutes
          const overtimeHours = Math.ceil(overtimeMinutes / 60)
          gameCost += overtimeHours * (session.station?.hourly_rate || 0)
        }
      } else {
        const hours = Math.ceil(elapsedMinutes / 60)
        gameCost = hours * (session.station?.hourly_rate || 0)
      }

      // Controller cost: 200 per 30 min
      let controllerCost = 0
      for (const controller of (controllers || [])) {
        const takenAt = new Date(controller.taken_at)
        const returnedAt = controller.returned_at ? new Date(controller.returned_at) : now
        const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
        const periods = Math.ceil(mins / 30)
        controllerCost += periods * 200
      }

      // Drink cost
      const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)

      const totalCost = gameCost + controllerCost + drinkCost

      return new Response(
        JSON.stringify({
          session,
          station: session.station,
          controllers: controllers || [],
          drinks: drinks || [],
          elapsedMinutes,
          gameCost,
          controllerCost,
          drinkCost,
          totalCost
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /sessions/:id/extend-package - Add another 2+1 package to extend session
    if (path.match(/^\/sessions\/[^/]+\/extend-package$/) && method === 'POST') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid session ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*, station:stations(*)')
        .eq('id', id)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify session ownership
      if (session.shift_id !== shift.id) {
        return new Response(
          JSON.stringify({ error: 'Вы не можете управлять сессией другого кассира' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Only package sessions can be extended
      if (session.tariff_type !== 'package') {
        return new Response(
          JSON.stringify({ error: 'Только пакетные сессии могут быть продлены' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Only active sessions can be extended
      if (session.status !== 'active') {
        return new Response(
          JSON.stringify({ error: 'Сессия уже завершена' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Increment package_count
      const newPackageCount = (session.package_count || 1) + 1

      const { data: updatedSession, error: updateError } = await supabase
        .from('sessions')
        .update({ package_count: newPackageCount })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Extend package error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Не удалось продлить пакет' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          package_count: newPackageCount,
          session: updatedSession 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /sessions/:id - Update session
    // Routes removed for debugging

    // Admin routes temporarily removed for debugging

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } })
  }
});
// end
