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

      const stationsWithData = stations.map(station => ({
        ...station,
        activeSession: sessionMap.get(station.id) || null,
        activeReservation: reservationMap.get(station.id) || null,
        activeBooking: bookingMap.get(station.id) || null
      }))

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

      const { data, error } = await supabase
        .from('sessions')
        .insert({ 
          station_id: body.station_id,
          tariff_type: body.tariff_type,
          status: 'active',
          shift_id: shift.id 
        })
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

      // Game cost calculation
      let gameCost = 0
      if (session.tariff_type === 'package') {
        gameCost = session.station?.package_rate || 0
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

    // PATCH /sessions/:id - Update session
    if (path.startsWith('/sessions/') && method === 'PATCH') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid session ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      
      // Only allow specific fields to be updated
      const allowedFields = ['status', 'ended_at', 'game_cost', 'controller_cost', 'drink_cost', 'total_cost']
      const updateData: Record<string, any> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field]
        }
      }

      const { data, error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Session update error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to update session' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /payments - Create payment and update shift totals
    if (path === '/payments' && method === 'POST') {
      const body = await req.json()
      const validation = validatePayment(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get session details to calculate category totals
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('game_cost, controller_cost, drink_cost')
        .eq('id', body.session_id)
        .single()

      const { data, error } = await supabase
        .from('payments')
        .insert({ 
          session_id: body.session_id,
          payment_method: body.payment_method,
          cash_amount: body.cash_amount || 0,
          kaspi_amount: body.kaspi_amount || 0,
          total_amount: body.total_amount,
          shift_id: shift.id 
        })
        .select()
        .single()

      if (error) {
        console.error('Payment create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to create payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update shift totals
      const gameCost = sessionData?.game_cost || 0
      const controllerCost = sessionData?.controller_cost || 0
      const drinkCost = sessionData?.drink_cost || 0

      await supabase
        .from('shifts')
        .update({
          total_cash: shift.total_cash + (body.cash_amount || 0),
          total_kaspi: shift.total_kaspi + (body.kaspi_amount || 0),
          total_games: shift.total_games + gameCost,
          total_controllers: shift.total_controllers + controllerCost,
          total_drinks: shift.total_drinks + drinkCost
        })
        .eq('id', shift.id)

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /controller-usage - Create controller usage
    if (path === '/controller-usage' && method === 'POST') {
      const body = await req.json()
      const validation = validateControllerUsage(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('controller_usage')
        .insert({ session_id: body.session_id })
        .select()
        .single()

      if (error) {
        console.error('Controller usage create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to add controller' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /controller-usage/:id - Update controller usage
    if (path.startsWith('/controller-usage/') && method === 'PATCH') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid controller usage ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const updateData: Record<string, any> = {}
      
      if (body.returned_at) updateData.returned_at = body.returned_at
      if (typeof body.cost === 'number' && body.cost >= 0) updateData.cost = body.cost

      const { data, error } = await supabase
        .from('controller_usage')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Controller usage update error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to update controller usage' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /session-drinks - Add drink to session
    if (path === '/session-drinks' && method === 'POST') {
      const body = await req.json()
      const validation = validateSessionDrink(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('session_drinks')
        .insert({
          session_id: body.session_id,
          drink_id: body.drink_id,
          quantity: body.quantity,
          total_price: body.total_price
        })
        .select()
        .single()

      if (error) {
        console.error('Session drink create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to add drink' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /drink-sales - Sell drink and update shift totals
    if (path === '/drink-sales' && method === 'POST') {
      const body = await req.json()
      const validation = validateDrinkSale(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('drink_sales')
        .insert({ 
          drink_id: body.drink_id,
          quantity: body.quantity,
          total_price: body.total_price,
          payment_method: body.payment_method,
          cash_amount: body.cash_amount || 0,
          kaspi_amount: body.kaspi_amount || 0,
          shift_id: shift.id 
        })
        .select()
        .single()

      if (error) {
        console.error('Drink sale create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to create drink sale' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update shift totals for drink sale
      await supabase
        .from('shifts')
        .update({
          total_cash: shift.total_cash + (body.cash_amount || 0),
          total_kaspi: shift.total_kaspi + (body.kaspi_amount || 0),
          total_drinks: shift.total_drinks + body.total_price
        })
        .eq('id', shift.id)

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /reservations - Create reservation
    if (path === '/reservations' && method === 'POST') {
      const body = await req.json()
      const validation = validateReservation(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('reservations')
        .insert({ 
          station_id: body.station_id,
          reserved_for: body.reserved_for,
          customer_name: body.customer_name || null,
          phone: body.phone || null,
          notes: body.notes || null,
          is_active: true,
          shift_id: shift.id 
        })
        .select()
        .single()

      if (error) {
        console.error('Reservation create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to create reservation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /reservations/:id - Update reservation
    if (path.startsWith('/reservations/') && method === 'PATCH') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid reservation ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const updateData: Record<string, any> = {}
      
      if (typeof body.is_active === 'boolean') updateData.is_active = body.is_active

      const { data, error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Reservation update error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to update reservation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /bookings - Create booking
    if (path === '/bookings' && method === 'POST') {
      const body = await req.json()
      const validation = validateBooking(body)
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          station_id: body.station_id,
          start_time: body.start_time,
          comment: body.comment || null,
          status: 'booked'
        })
        .select()
        .single()

      if (error) {
        console.error('Booking create error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to create booking' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /bookings/:id - Update booking
    if (path.startsWith('/bookings/') && method === 'PATCH') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid booking ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()
      const updateData: Record<string, any> = {}
      
      if (['booked', 'cancelled', 'completed'].includes(body.status)) {
        updateData.status = body.status
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Booking update error:', error)
        return new Response(
          JSON.stringify({ error: 'Unable to update booking' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /shift - Get current shift data
    if (path === '/shift' && method === 'GET') {
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shift.id)
        .single()

      return new Response(
        JSON.stringify(shiftData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /shift/report - Get shift report
    if (path === '/shift/report' && method === 'GET') {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('shift_id', shift.id)

      const { data: drinkSales } = await supabase
        .from('drink_sales')
        .select('*, drinks(*)')
        .eq('shift_id', shift.id)

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('shift_id', shift.id)

      return new Response(
        JSON.stringify({
          shift,
          payments,
          drinkSales,
          sessions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET /shift/history - Get full shift history with sessions and drink sales
    if (path === '/shift/history' && method === 'GET') {
      // Fetch completed sessions with station info
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*, station:stations(*)')
        .eq('shift_id', shift.id)
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })

      // Fetch controller usage and drinks for each session
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session: any) => {
          // Get controllers
          const { data: controllers } = await supabase
            .from('controller_usage')
            .select('*')
            .eq('session_id', session.id)

          // Get drinks count
          const { count: drinksCount } = await supabase
            .from('session_drinks')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)

          // Get payment info
          const { data: payment } = await supabase
            .from('payments')
            .select('payment_method, cash_amount, kaspi_amount')
            .eq('session_id', session.id)
            .maybeSingle()
          
          return {
            ...session,
            controllers: controllers || [],
            drinks_count: drinksCount || 0,
            payment_method: payment?.payment_method || 'cash',
            cash_amount: payment?.cash_amount || 0,
            kaspi_amount: payment?.kaspi_amount || 0
          }
        })
      )

      // Fetch standalone drink sales
      const { data: drinkSalesData } = await supabase
        .from('drink_sales')
        .select('*, drink:drinks(*)')
        .eq('shift_id', shift.id)
        .order('created_at', { ascending: false })

      return new Response(
        JSON.stringify({
          sessions: sessionsWithDetails || [],
          drinkSales: drinkSalesData || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========== ADMIN ROUTES ==========
    // Admin routes require admin role
    if (path.startsWith('/admin/')) {
      const userRole = await getUserRole(supabase, shift.cashier_id)
      
      if (userRole !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Доступ запрещён' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /admin/cashiers - List all cashiers
      if (path === '/admin/cashiers' && method === 'GET') {
        const { data, error } = await supabase
          .from('cashiers')
          .select('id, name, pin, created_at')
          .order('created_at')

        if (error) {
          console.error('Cashiers fetch error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки кассиров' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // POST /admin/cashiers - Create new cashier
      if (path === '/admin/cashiers' && method === 'POST') {
        const body = await req.json()
        const validation = validateCashier(body)
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('cashiers')
          .insert({
            name: body.name.trim(),
            pin: body.pin
          })
          .select()
          .single()

        if (error) {
          console.error('Cashier create error:', error)
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'PIN-код уже существует' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ error: 'Ошибка создания кассира' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // PATCH /admin/cashiers/:id - Update cashier
      if (path.startsWith('/admin/cashiers/') && method === 'PATCH') {
        const id = path.split('/')[3]
        if (!isValidUUID(id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid cashier ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body = await req.json()
        
        // Build update object
        const updateData: Record<string, any> = {}
        if (body.name !== undefined) {
          if (typeof body.name !== 'string' || body.name.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: 'Имя обязательно' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          if (body.name.length > 50) {
            return new Response(
              JSON.stringify({ error: 'Имя слишком длинное' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          updateData.name = body.name.trim()
        }
        if (body.pin !== undefined) {
          if (!/^\d{4}$/.test(body.pin)) {
            return new Response(
              JSON.stringify({ error: 'PIN должен содержать 4 цифры' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          updateData.pin = body.pin
        }

        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Нет данных для обновления' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('cashiers')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          console.error('Cashier update error:', error)
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'PIN-код уже существует' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления кассира' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DELETE /admin/cashiers/:id - Delete cashier
      if (path.startsWith('/admin/cashiers/') && method === 'DELETE') {
        const id = path.split('/')[3]
        if (!isValidUUID(id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid cashier ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prevent self-deletion
        if (id === shift.cashier_id) {
          return new Response(
            JSON.stringify({ error: 'Нельзя удалить себя' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if cashier has active shift
        const { data: activeShift } = await supabase
          .from('shifts')
          .select('id')
          .eq('cashier_id', id)
          .eq('is_active', true)
          .maybeSingle()

        if (activeShift) {
          return new Response(
            JSON.stringify({ error: 'У кассира активная смена' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('cashiers')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('Cashier delete error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка удаления кассира' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    )
  }
})
