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
    if (path.startsWith('/sessions/') && method === 'PATCH') {
      const id = path.split('/')[2]
      if (!isValidUUID(id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid session ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify session ownership - only the cashier who opened the session can modify it
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('shift_id')
        .eq('id', id)
        .single()

      if (!existingSession) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingSession.shift_id !== shift.id) {
        return new Response(
          JSON.stringify({ error: 'Вы не можете управлять сессией другого кассира' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // GET /discount-presets - Get available discount presets for current cashier
    if (path === '/discount-presets' && method === 'GET') {
      // Get cashier's max discount limit
      const { data: cashierData } = await supabase
        .from('cashiers')
        .select('max_discount_percent')
        .eq('id', shift.cashier_id)
        .single()

      const maxDiscount = cashierData?.max_discount_percent || 0

      // Get active presets filtered by cashier's max discount
      const { data: presets } = await supabase
        .from('discount_presets')
        .select('*')
        .eq('is_active', true)
        .lte('percent', maxDiscount)
        .order('percent')

      return new Response(
        JSON.stringify({ presets: presets || [], max_discount_percent: maxDiscount }),
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

      // Get session details and verify ownership
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('shift_id, game_cost, controller_cost, drink_cost')
        .eq('id', body.session_id)
        .single()

      if (!sessionData) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify session ownership - only the cashier who opened the session can process payment
      if (sessionData.shift_id !== shift.id) {
        return new Response(
          JSON.stringify({ error: 'Вы не можете принять оплату за сессию другого кассира' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({ 
          session_id: body.session_id,
          payment_method: body.payment_method,
          cash_amount: body.cash_amount || 0,
          kaspi_amount: body.kaspi_amount || 0,
          total_amount: body.total_amount,
          discount_percent: body.discount_percent || 0,
          discount_amount: body.discount_amount || 0,
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

      // Debounce: check if a controller was added to this session in the last 3 seconds
      const { data: recentController } = await supabase
        .from('controller_usage')
        .select('id, taken_at')
        .eq('session_id', body.session_id)
        .order('taken_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentController) {
        const timeSinceLastAdd = Date.now() - new Date(recentController.taken_at).getTime()
        if (timeSinceLastAdd < 3000) {
          return new Response(
            JSON.stringify({ error: 'Защита от дублей! Добавьте через 3 секунды!' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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

      // Parse path parts for routes with dynamic segments
      const pathParts = path.split('/').filter(Boolean) // ['admin', 'sessions', ':id']

      // GET /admin/cashiers - List all cashiers
      if (path === '/admin/cashiers' && method === 'GET') {
        const { data, error } = await supabase
          .from('cashiers')
          .select('id, name, pin, created_at, max_discount_percent')
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
        if (body.max_discount_percent !== undefined) {
          const maxDiscount = parseInt(body.max_discount_percent)
          if (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 100) {
            return new Response(
              JSON.stringify({ error: 'Процент скидки должен быть от 0 до 100' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          updateData.max_discount_percent = maxDiscount
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

      // GET /admin/shifts-analytics - Get shifts analytics for dashboard
      if (path === '/admin/shifts-analytics' && method === 'GET') {
        const fromDate = url.searchParams.get('from')
        const toDate = url.searchParams.get('to')
        const cashierId = url.searchParams.get('cashier_id')

        if (!fromDate || !toDate) {
          return new Response(
            JSON.stringify({ error: 'from and to dates are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const from = new Date(fromDate)
        const to = new Date(toDate)
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
          return new Response(
            JSON.stringify({ error: 'Invalid date format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get all cashiers for filter (exclude admins)
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('cashier_id')
          .eq('role', 'admin')
        
        const adminCashierIds = (adminRoles || []).map((r: any) => r.cashier_id).filter(Boolean)
        
        const { data: cashiers } = await supabase
          .from('cashiers')
          .select('id, name')
          .order('name')
        
        const filteredCashiers = (cashiers || []).filter((c: any) => !adminCashierIds.includes(c.id))

        // Helper to fetch shifts for a period (handles >1000 rows with pagination)
        async function fetchShiftsForPeriod(periodFrom: Date, periodTo: Date, filterCashierId?: string | null, excludeActive = true) {
          let allShifts: any[] = []
          let offset = 0
          const PAGE_SIZE = 1000
          
          while (true) {
            let query = supabase
              .from('shifts')
              .select('id, cashier_id, started_at, ended_at, is_active, total_cash, total_kaspi, total_games, total_controllers, total_drinks, cashiers(name)')
              .lte('started_at', periodTo.toISOString())
              .or(`ended_at.gte.${periodFrom.toISOString()},ended_at.is.null`)
              .order('started_at', { ascending: false })
              .range(offset, offset + PAGE_SIZE - 1)

            if (excludeActive) {
              query = query.eq('is_active', false)
            }

            // Always exclude admin sessions from analytics
            query = query.eq('is_admin_session', false)

            if (filterCashierId && isValidUUID(filterCashierId)) {
              query = query.eq('cashier_id', filterCashierId)
            }

            const { data, error } = await query
            if (error) throw error
            
            allShifts = allShifts.concat(data || [])
            if (!data || data.length < PAGE_SIZE) break
            offset += PAGE_SIZE
          }
          
          return allShifts
        }

        // Helper to fetch session counts (handles >1000 rows)
        async function fetchSessionCounts(shiftIds: string[]) {
          const counts: Record<string, number> = {}
          if (shiftIds.length === 0) return counts
          
          // Process in batches of 100 IDs for the IN filter
          for (let i = 0; i < shiftIds.length; i += 100) {
            const batch = shiftIds.slice(i, i + 100)
            let offset = 0
            const PAGE_SIZE = 1000
            
            while (true) {
              const { data } = await supabase
                .from('sessions')
                .select('shift_id')
                .in('shift_id', batch)
                .eq('status', 'completed')
                .range(offset, offset + PAGE_SIZE - 1)
              
              ;(data || []).forEach((s: any) => {
                counts[s.shift_id] = (counts[s.shift_id] || 0) + 1
              })
              
              if (!data || data.length < PAGE_SIZE) break
              offset += PAGE_SIZE
            }
          }
          return counts
        }

        // Helper to compute working day key from a date (operational day 16:00-04:00 UTC+5)
        function getWorkingDayKey(dateStr: string): string {
          const d = new Date(dateStr)
          const utcHour = d.getUTCHours()
          const astanaHour = (utcHour + 5) % 24
          
          const workingDay = new Date(d)
          if (astanaHour >= 0 && astanaHour < 4) {
            workingDay.setUTCDate(workingDay.getUTCDate() - 1)
          }
          return workingDay.toISOString().split('T')[0]
        }

        // Helper to format shifts with duration and session counts
        function formatShifts(shifts: any[], sessionCounts: Record<string, number>) {
          return shifts.map((s: any) => {
            const startedAt = new Date(s.started_at)
            const endedAt = s.ended_at ? new Date(s.ended_at) : new Date()
            const durationHours = (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
            
            return {
              id: s.id,
              cashier_id: s.cashier_id,
              cashier_name: s.cashiers?.name || 'Unknown',
              started_at: s.started_at,
              ended_at: s.ended_at,
              is_active: s.is_active,
              total_cash: s.total_cash || 0,
              total_kaspi: s.total_kaspi || 0,
              total_games: s.total_games || 0,
              total_controllers: s.total_controllers || 0,
              total_drinks: s.total_drinks || 0,
              sessions_count: sessionCounts[s.id] || 0,
              duration_hours: Math.round(durationHours * 10) / 10
            }
          })
        }

        // Helper to calculate totals from formatted shifts
        function calculatePeriodTotals(formattedShifts: any[]) {
          const workingDays = new Set<string>()
          formattedShifts.forEach((s: any) => {
            workingDays.add(getWorkingDayKey(s.started_at))
          })

          const raw = formattedShifts.reduce((acc: any, s: any) => ({
            revenue: acc.revenue + s.total_cash + s.total_kaspi,
            cash: acc.cash + s.total_cash,
            kaspi: acc.kaspi + s.total_kaspi,
            games: acc.games + s.total_games,
            controllers: acc.controllers + s.total_controllers,
            drinks: acc.drinks + s.total_drinks,
            sessions: acc.sessions + s.sessions_count,
            totalHours: acc.totalHours + s.duration_hours
          }), { revenue: 0, cash: 0, kaspi: 0, games: 0, controllers: 0, drinks: 0, sessions: 0, totalHours: 0 })

          return {
            ...raw,
            shiftsCount: workingDays.size,
            avgCheck: raw.sessions > 0 ? Math.round(raw.revenue / raw.sessions) : 0,
            revenuePerHour: raw.totalHours > 0 ? Math.round(raw.revenue / raw.totalHours) : 0
          }
        }

        try {
          // === CURRENT PERIOD ===
          const shifts = await fetchShiftsForPeriod(from, to, cashierId, true)
          const shiftIds = shifts.map((s: any) => s.id)
          const sessionCounts = await fetchSessionCounts(shiftIds)
          const formattedShifts = formatShifts(shifts, sessionCounts)
          const totals = calculatePeriodTotals(formattedShifts)

          // === PREVIOUS PERIOD (same length, right before current) ===
          const periodLength = to.getTime() - from.getTime()
          const prevFrom = new Date(from.getTime() - periodLength)
          const prevTo = new Date(from.getTime() - 1)

          const prevShifts = await fetchShiftsForPeriod(prevFrom, prevTo, cashierId, true)
          const prevShiftIds = prevShifts.map((s: any) => s.id)
          const prevSessionCounts = await fetchSessionCounts(prevShiftIds)
          const prevFormattedShifts = formatShifts(prevShifts, prevSessionCounts)
          const previousPeriodTotals = calculatePeriodTotals(prevFormattedShifts)

          // === DRINK ANALYTICS ===
          // Get all drink sales for shifts in current period
          let drinkAnalytics: any = { topDrinks: [], drinksByDay: [] }
          
          if (shiftIds.length > 0) {
            // Fetch drink sales with drink names (paginated)
            let allDrinkSales: any[] = []
            for (let i = 0; i < shiftIds.length; i += 100) {
              const batch = shiftIds.slice(i, i + 100)
              let offset = 0
              while (true) {
                const { data } = await supabase
                  .from('drink_sales')
                  .select('id, shift_id, drink_id, quantity, total_price, payment_method, cash_amount, kaspi_amount, created_at, drinks(name, price)')
                  .in('shift_id', batch)
                  .range(offset, offset + 999)
                
                allDrinkSales = allDrinkSales.concat(data || [])
                if (!data || data.length < 1000) break
                offset += 1000
              }
            }

            // Also fetch session drinks
            let allSessionDrinks: any[] = []
            for (let i = 0; i < shiftIds.length; i += 100) {
              const batch = shiftIds.slice(i, i + 100)
              // Get sessions for these shifts first
              const { data: sessionsForDrinks } = await supabase
                .from('sessions')
                .select('id, shift_id')
                .in('shift_id', batch)
                .eq('status', 'completed')
              
              const sessionIds = (sessionsForDrinks || []).map((s: any) => s.id)
              if (sessionIds.length > 0) {
                for (let j = 0; j < sessionIds.length; j += 100) {
                  const sessionBatch = sessionIds.slice(j, j + 100)
                  const { data } = await supabase
                    .from('session_drinks')
                    .select('id, session_id, drink_id, quantity, total_price, created_at, drinks(name, price)')
                    .in('session_id', sessionBatch)
                  
                  // Map session_id back to shift_id
                  const sessionToShift: Record<string, string> = {}
                  ;(sessionsForDrinks || []).forEach((s: any) => { sessionToShift[s.id] = s.shift_id })
                  
                  ;(data || []).forEach((d: any) => {
                    allSessionDrinks.push({
                      ...d,
                      shift_id: sessionToShift[d.session_id]
                    })
                  })
                }
              }
            }

            // Top drinks - aggregate by drink name
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

            const topDrinks = Array.from(drinkMap.values())
              .sort((a, b) => b.totalRevenue - a.totalRevenue)

            // Drinks by day (operational day grouping)
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

            const drinksByDay = Array.from(dayMap.values())
              .sort((a, b) => a.date.localeCompare(b.date))

            // Drinks by cashier
            const cashierDrinkMap = new Map<string, { cashier_id: string; cashier_name: string; totalRevenue: number; totalQuantity: number }>()
            
            allDrinkSales.forEach((sale: any) => {
              const shift = formattedShifts.find((s: any) => s.id === sale.shift_id)
              if (!shift) return
              const existing = cashierDrinkMap.get(shift.cashier_id) || { cashier_id: shift.cashier_id, cashier_name: shift.cashier_name, totalRevenue: 0, totalQuantity: 0 }
              existing.totalRevenue += sale.total_price || 0
              existing.totalQuantity += sale.quantity || 1
              cashierDrinkMap.set(shift.cashier_id, existing)
            })

            allSessionDrinks.forEach((item: any) => {
              const shift = formattedShifts.find((s: any) => s.id === item.shift_id)
              if (!shift) return
              const existing = cashierDrinkMap.get(shift.cashier_id) || { cashier_id: shift.cashier_id, cashier_name: shift.cashier_name, totalRevenue: 0, totalQuantity: 0 }
              existing.totalRevenue += item.total_price || 0
              existing.totalQuantity += item.quantity || 1
              cashierDrinkMap.set(shift.cashier_id, existing)
            })

            const drinksByCashier = Array.from(cashierDrinkMap.values())
              .sort((a, b) => b.totalRevenue - a.totalRevenue)

            drinkAnalytics = { topDrinks, drinksByDay, drinksByCashier }
          }

          // === PREVIOUS PERIOD CHART DATA (for overlay) ===
          const prevChartData = prevFormattedShifts.length > 0 ? (() => {
            const dayMap = new Map<string, { revenue: number; cash: number; kaspi: number; sessions: number }>()
            prevFormattedShifts.forEach((s: any) => {
              const dayKey = getWorkingDayKey(s.started_at)
              const existing = dayMap.get(dayKey) || { revenue: 0, cash: 0, kaspi: 0, sessions: 0 }
              existing.revenue += s.total_cash + s.total_kaspi
              existing.cash += s.total_cash
              existing.kaspi += s.total_kaspi
              existing.sessions += s.sessions_count
              dayMap.set(dayKey, existing)
            })
            return Array.from(dayMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, data]) => ({ date, ...data }))
          })() : []

          // === ZONE ANALYTICS ===
          let zoneAnalytics: any = { zones: [], zonesByDay: [] }
          
          if (shiftIds.length > 0) {
            // Fetch completed sessions with station zone for current period shifts
            let allSessions: any[] = []
            for (let i = 0; i < shiftIds.length; i += 100) {
              const batch = shiftIds.slice(i, i + 100)
              let offset = 0
              while (true) {
                const { data } = await supabase
                  .from('sessions')
                  .select('id, shift_id, game_cost, controller_cost, drink_cost, total_cost, started_at, stations(zone, name)')
                  .in('shift_id', batch)
                  .eq('status', 'completed')
                  .range(offset, offset + 999)
                
                allSessions = allSessions.concat(data || [])
                if (!data || data.length < 1000) break
                offset += 1000
              }
            }

            // Aggregate by zone
            const zoneMap = new Map<string, { zone: string; sessions: number; revenue: number; gameCost: number; controllerCost: number; drinkCost: number; avgCheck: number }>()
            
            allSessions.forEach((s: any) => {
              const zone = s.stations?.zone || 'unknown'
              const existing = zoneMap.get(zone) || { zone, sessions: 0, revenue: 0, gameCost: 0, controllerCost: 0, drinkCost: 0, avgCheck: 0 }
              existing.sessions += 1
              existing.revenue += s.total_cost || 0
              existing.gameCost += s.game_cost || 0
              existing.controllerCost += s.controller_cost || 0
              existing.drinkCost += s.drink_cost || 0
              zoneMap.set(zone, existing)
            })

            zoneMap.forEach(z => {
              z.avgCheck = z.sessions > 0 ? Math.round(z.revenue / z.sessions) : 0
            })

            const zones = Array.from(zoneMap.values()).sort((a, b) => b.revenue - a.revenue)

            // Zone revenue by day
            const zoneDayMap = new Map<string, { date: string; vip: number; hall: number }>()
            allSessions.forEach((s: any) => {
              const dayKey = getWorkingDayKey(s.started_at)
              const zone = s.stations?.zone || 'unknown'
              const existing = zoneDayMap.get(dayKey) || { date: dayKey, vip: 0, hall: 0 }
              if (zone === 'vip') existing.vip += s.total_cost || 0
              else existing.hall += s.total_cost || 0
              zoneDayMap.set(dayKey, existing)
            })

            const zonesByDay = Array.from(zoneDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

            zoneAnalytics = { zones, zonesByDay }
          }

          // === DISCOUNT ANALYTICS ===
          let discountAnalytics: any = { totalDiscounts: 0, totalDiscountAmount: 0, avgDiscountPercent: 0, discountsByCashier: [], discountsByDay: [] }
          
          if (shiftIds.length > 0) {
            let allPayments: any[] = []
            for (let i = 0; i < shiftIds.length; i += 100) {
              const batch = shiftIds.slice(i, i + 100)
              let offset = 0
              while (true) {
                const { data } = await supabase
                  .from('payments')
                  .select('id, shift_id, session_id, discount_percent, discount_amount, total_amount, created_at')
                  .in('shift_id', batch)
                  .gt('discount_percent', 0)
                  .range(offset, offset + 999)
                
                allPayments = allPayments.concat(data || [])
                if (!data || data.length < 1000) break
                offset += 1000
              }
            }

            const totalDiscounts = allPayments.length
            const totalDiscountAmount = allPayments.reduce((sum: number, p: any) => sum + (p.discount_amount || 0), 0)
            const avgDiscountPercent = totalDiscounts > 0 
              ? Math.round(allPayments.reduce((sum: number, p: any) => sum + (p.discount_percent || 0), 0) / totalDiscounts)
              : 0

            // Discounts by cashier
            const cashierDiscountMap = new Map<string, { cashier_id: string; cashier_name: string; count: number; totalAmount: number; avgPercent: number; percentSum: number }>()
            allPayments.forEach((p: any) => {
              const shift = formattedShifts.find((s: any) => s.id === p.shift_id)
              if (!shift) return
              const existing = cashierDiscountMap.get(shift.cashier_id) || { cashier_id: shift.cashier_id, cashier_name: shift.cashier_name, count: 0, totalAmount: 0, avgPercent: 0, percentSum: 0 }
              existing.count += 1
              existing.totalAmount += p.discount_amount || 0
              existing.percentSum += p.discount_percent || 0
              cashierDiscountMap.set(shift.cashier_id, existing)
            })
            cashierDiscountMap.forEach(c => {
              c.avgPercent = c.count > 0 ? Math.round(c.percentSum / c.count) : 0
            })
            const discountsByCashier = Array.from(cashierDiscountMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

            // Discounts by day
            const discountDayMap = new Map<string, { date: string; count: number; amount: number }>()
            allPayments.forEach((p: any) => {
              const dayKey = getWorkingDayKey(p.created_at)
              const existing = discountDayMap.get(dayKey) || { date: dayKey, count: 0, amount: 0 }
              existing.count += 1
              existing.amount += p.discount_amount || 0
              discountDayMap.set(dayKey, existing)
            })
            const discountsByDay = Array.from(discountDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))

            discountAnalytics = { totalDiscounts, totalDiscountAmount, avgDiscountPercent, discountsByCashier, discountsByDay }
          }

          return new Response(
            JSON.stringify({
              shifts: formattedShifts,
              cashiers: filteredCashiers,
              totals,
              previousPeriodTotals,
              drinkAnalytics,
              prevChartData,
              zoneAnalytics,
              discountAnalytics
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Analytics error:', err)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch analytics' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // GET /admin/active-sessions - Get all active sessions across all shifts
      if (path === '/admin/active-sessions' && method === 'GET') {
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select(`
            id, station_id, shift_id, tariff_type, started_at, status,
            station:stations(id, name, zone, station_number, hourly_rate, package_rate),
            shift:shifts(id, cashier_id, is_active, cashiers(id, name))
          `)
          .eq('status', 'active')
          .order('started_at', { ascending: true })

        if (error) {
          console.error('Active sessions fetch error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки сессий' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate current cost for each session
        const sessionsWithCost = await Promise.all((sessions || []).map(async (session: any) => {
          const now = new Date()
          const startedAt = new Date(session.started_at)
          const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

          // Game cost
          let gameCost = 0
          if (session.tariff_type === 'package') {
            gameCost = session.station?.package_rate || 0
          } else {
            const hours = Math.ceil(elapsedMinutes / 60)
            gameCost = hours * (session.station?.hourly_rate || 0)
          }

          // Controller cost
          const { data: controllers } = await supabase
            .from('controller_usage')
            .select('*')
            .eq('session_id', session.id)

          let controllerCost = 0
          for (const c of (controllers || [])) {
            const takenAt = new Date(c.taken_at)
            const returnedAt = c.returned_at ? new Date(c.returned_at) : now
            const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
            const periods = Math.ceil(mins / 30)
            controllerCost += periods * 200
          }

          // Drink cost
          const { data: drinks } = await supabase
            .from('session_drinks')
            .select('total_price')
            .eq('session_id', session.id)

          const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)

          return {
            ...session,
            cashier_name: session.shift?.cashiers?.name || 'Unknown',
            shift_is_active: session.shift?.is_active || false,
            elapsed_minutes: elapsedMinutes,
            game_cost: gameCost,
            controller_cost: controllerCost,
            drink_cost: drinkCost,
            total_cost: gameCost + controllerCost + drinkCost,
            controllers_count: (controllers || []).filter((c: any) => !c.returned_at).length
          }
        }))

        return new Response(
          JSON.stringify(sessionsWithCost),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // POST /admin/force-close-session - Force close a session with payment to original cashier
      if (path === '/admin/force-close-session' && method === 'POST') {
        const body = await req.json()
        
        if (!body.session_id || !isValidUUID(body.session_id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid session_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!['cash', 'kaspi', 'split'].includes(body.payment_method)) {
          return new Response(
            JSON.stringify({ error: 'Invalid payment_method' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get session details
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*, station:stations(*), shift:shifts(*)')
          .eq('id', body.session_id)
          .eq('status', 'active')
          .single()

        if (sessionError || !session) {
          return new Response(
            JSON.stringify({ error: 'Сессия не найдена или уже завершена' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate costs at current time
        const now = new Date()
        const startedAt = new Date(session.started_at)
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000)

        // Game cost
        let gameCost = 0
        if (session.tariff_type === 'package') {
          gameCost = session.station?.package_rate || 0
        } else {
          const hours = Math.ceil(elapsedMinutes / 60)
          gameCost = hours * (session.station?.hourly_rate || 0)
        }

        // Controller cost
        const { data: controllers } = await supabase
          .from('controller_usage')
          .select('*')
          .eq('session_id', session.id)

        let controllerCost = 0
        for (const c of (controllers || [])) {
          const takenAt = new Date(c.taken_at)
          const returnedAt = c.returned_at ? new Date(c.returned_at) : now
          const mins = Math.floor((returnedAt.getTime() - takenAt.getTime()) / 60000)
          const periods = Math.ceil(mins / 30)
          controllerCost += periods * 200
        }

        // Return all active controllers
        const activeControllers = (controllers || []).filter((c: any) => !c.returned_at)
        for (const c of activeControllers) {
          const takenAt = new Date(c.taken_at)
          const mins = Math.floor((now.getTime() - takenAt.getTime()) / 60000)
          const periods = Math.ceil(mins / 30)
          const cost = periods * 200

          await supabase
            .from('controller_usage')
            .update({ returned_at: now.toISOString(), cost })
            .eq('id', c.id)
        }

        // Drink cost
        const { data: drinks } = await supabase
          .from('session_drinks')
          .select('total_price')
          .eq('session_id', session.id)

        const drinkCost = (drinks || []).reduce((sum: number, d: any) => sum + (d.total_price || 0), 0)
        const totalCost = gameCost + controllerCost + drinkCost

        // Determine cash/kaspi amounts
        let cashAmount = 0
        let kaspiAmount = 0
        if (body.payment_method === 'cash') {
          cashAmount = totalCost
        } else if (body.payment_method === 'kaspi') {
          kaspiAmount = totalCost
        } else if (body.payment_method === 'split') {
          cashAmount = body.cash_amount || 0
          kaspiAmount = body.kaspi_amount || 0
        }

        // Update session
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            ended_at: now.toISOString(),
            game_cost: gameCost,
            controller_cost: controllerCost,
            drink_cost: drinkCost,
            total_cost: totalCost
          })
          .eq('id', session.id)

        // Create payment record pointing to ORIGINAL shift
        await supabase
          .from('payments')
          .insert({
            session_id: session.id,
            shift_id: session.shift_id, // Original cashier's shift
            payment_method: body.payment_method,
            cash_amount: cashAmount,
            kaspi_amount: kaspiAmount,
            total_amount: totalCost
          })

        // Update original shift totals
        const { data: originalShift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', session.shift_id)
          .single()

        if (originalShift) {
          await supabase
            .from('shifts')
            .update({
              total_cash: (originalShift.total_cash || 0) + cashAmount,
              total_kaspi: (originalShift.total_kaspi || 0) + kaspiAmount,
              total_games: (originalShift.total_games || 0) + gameCost,
              total_controllers: (originalShift.total_controllers || 0) + controllerCost,
              total_drinks: (originalShift.total_drinks || 0) + drinkCost
            })
            .eq('id', session.shift_id)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            session_id: session.id,
            total_cost: totalCost,
            game_cost: gameCost,
            controller_cost: controllerCost,
            drink_cost: drinkCost
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /admin/completed-sessions - Get completed sessions for last 7 days
      if (path === '/admin/completed-sessions' && method === 'GET') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: sessions, error } = await supabase
          .from('sessions')
          .select(`
            id, station_id, shift_id, tariff_type, started_at, ended_at, status,
            game_cost, controller_cost, drink_cost, total_cost, package_count,
            station:stations(id, name, zone, station_number),
            shift:shifts(id, cashier_id, cashiers(id, name))
          `)
          .eq('status', 'completed')
          .gte('ended_at', sevenDaysAgo.toISOString())
          .order('ended_at', { ascending: false })
          .limit(100)

        if (error) {
          console.error('Completed sessions fetch error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки сессий' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get payment info for each session
        const sessionIds = (sessions || []).map(s => s.id)
        const { data: payments } = await supabase
          .from('payments')
          .select('session_id, payment_method, cash_amount, kaspi_amount, total_amount')
          .in('session_id', sessionIds)

        const paymentMap = new Map((payments || []).map(p => [p.session_id, p]))

        // Get controller usage for each session
        const { data: controllers } = await supabase
          .from('controller_usage')
          .select('id, session_id, taken_at, returned_at, cost')
          .in('session_id', sessionIds)

        const controllerMap = new Map<string, any[]>()
        for (const c of (controllers || [])) {
          if (!controllerMap.has(c.session_id)) {
            controllerMap.set(c.session_id, [])
          }
          controllerMap.get(c.session_id)!.push(c)
        }

        const formattedSessions = (sessions || []).map((s: any) => ({
          id: s.id,
          station_id: s.station_id,
          station_name: s.station?.name || 'Unknown',
          station_zone: s.station?.zone || '',
          shift_id: s.shift_id,
          cashier_id: s.shift?.cashier_id,
          cashier_name: s.shift?.cashiers?.name || 'Unknown',
          tariff_type: s.tariff_type,
          package_count: s.package_count,
          started_at: s.started_at,
          ended_at: s.ended_at,
          game_cost: s.game_cost || 0,
          controller_cost: s.controller_cost || 0,
          drink_cost: s.drink_cost || 0,
          total_cost: s.total_cost || 0,
          payment: paymentMap.get(s.id) || null,
          controllers: controllerMap.get(s.id) || []
        }))

        return new Response(
          JSON.stringify(formattedSessions),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /admin/drink-sales - Get drink sales for last 7 days
      if (path === '/admin/drink-sales' && method === 'GET') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: sales, error } = await supabase
          .from('drink_sales')
          .select(`
            id, shift_id, drink_id, quantity, total_price, 
            payment_method, cash_amount, kaspi_amount, created_at,
            drink:drinks(id, name, price),
            shift:shifts(id, cashier_id, cashiers(id, name))
          `)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          console.error('Drink sales fetch error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки продаж' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const formattedSales = (sales || []).map((s: any) => ({
          id: s.id,
          shift_id: s.shift_id,
          cashier_name: s.shift?.cashiers?.name || 'Unknown',
          drink_id: s.drink_id,
          drink_name: s.drink?.name || 'Unknown',
          quantity: s.quantity,
          total_price: s.total_price,
          payment_method: s.payment_method,
          cash_amount: s.cash_amount || 0,
          kaspi_amount: s.kaspi_amount || 0,
          created_at: s.created_at
        }))

        return new Response(
          JSON.stringify(formattedSales),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /admin/audit-log - Get audit log
      if (path === '/admin/audit-log' && method === 'GET') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: logs, error } = await supabase
          .from('admin_audit_log')
          .select(`
            id, admin_id, action_type, target_type, target_id,
            shift_id, cashier_name, station_name, old_values, new_values,
            reason, created_at,
            admin:cashiers!admin_audit_log_admin_id_fkey(id, name)
          `)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) {
          console.error('Audit log fetch error:', error)
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки журнала' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const formattedLogs = (logs || []).map((l: any) => ({
          id: l.id,
          admin_id: l.admin_id,
          admin_name: l.admin?.name || 'Unknown',
          action_type: l.action_type,
          target_type: l.target_type,
          target_id: l.target_id,
          shift_id: l.shift_id,
          cashier_name: l.cashier_name,
          station_name: l.station_name,
          old_values: l.old_values,
          new_values: l.new_values,
          reason: l.reason,
          created_at: l.created_at
        }))

        return new Response(
          JSON.stringify(formattedLogs),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // PATCH /admin/sessions/:id - Edit completed session
      if (pathParts.length === 3 && pathParts[1] === 'sessions' && method === 'PATCH') {
        const sessionId = pathParts[2]
        if (!isValidUUID(sessionId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid session ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body = await req.json()
        if (!body.reason || body.reason.trim().length < 5) {
          return new Response(
            JSON.stringify({ error: 'Укажите причину корректировки (минимум 5 символов)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get current session with payment
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select(`
            id, station_id, shift_id, tariff_type, started_at, ended_at, status,
            game_cost, controller_cost, drink_cost, total_cost, package_count,
            station:stations(id, name),
            shift:shifts(id, cashier_id, cashiers(id, name))
          `)
          .eq('id', sessionId)
          .eq('status', 'completed')
          .single()

        if (sessionError || !session) {
          return new Response(
            JSON.stringify({ error: 'Сессия не найдена' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get current payment
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        if (!payment) {
          return new Response(
            JSON.stringify({ error: 'Платёж не найден' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Calculate differences for shift update
        const oldGameCost = session.game_cost || 0
        const oldControllerCost = session.controller_cost || 0
        const oldDrinkCost = session.drink_cost || 0
        const oldCashAmount = payment.cash_amount || 0
        const oldKaspiAmount = payment.kaspi_amount || 0

        const newGameCost = body.game_cost ?? oldGameCost
        const newControllerCost = body.controller_cost ?? oldControllerCost
        const newDrinkCost = body.drink_cost ?? oldDrinkCost
        const newTotalCost = newGameCost + newControllerCost + newDrinkCost
        const newCashAmount = body.cash_amount ?? oldCashAmount
        const newKaspiAmount = body.kaspi_amount ?? oldKaspiAmount

        // Validate payment amounts
        if (newCashAmount + newKaspiAmount !== newTotalCost) {
          return new Response(
            JSON.stringify({ error: 'Сумма наличных + Kaspi должна равняться итогу' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Determine payment method
        let newPaymentMethod = payment.payment_method
        if (newCashAmount > 0 && newKaspiAmount > 0) {
          newPaymentMethod = 'split'
        } else if (newCashAmount > 0) {
          newPaymentMethod = 'cash'
        } else {
          newPaymentMethod = 'kaspi'
        }

        // Update session
        await supabase
          .from('sessions')
          .update({
            game_cost: newGameCost,
            controller_cost: newControllerCost,
            drink_cost: newDrinkCost,
            total_cost: newTotalCost
          })
          .eq('id', sessionId)

        // Update payment
        await supabase
          .from('payments')
          .update({
            payment_method: newPaymentMethod,
            cash_amount: newCashAmount,
            kaspi_amount: newKaspiAmount,
            total_amount: newTotalCost
          })
          .eq('session_id', sessionId)

        // Update controller times if provided
        if (body.controllers && Array.isArray(body.controllers)) {
          for (const ctrl of body.controllers) {
            if (ctrl.id && isValidUUID(ctrl.id)) {
              const updateData: any = {}
              if (ctrl.taken_at) updateData.taken_at = ctrl.taken_at
              if (ctrl.returned_at) updateData.returned_at = ctrl.returned_at
              if (ctrl.cost !== undefined) updateData.cost = ctrl.cost

              if (Object.keys(updateData).length > 0) {
                await supabase
                  .from('controller_usage')
                  .update(updateData)
                  .eq('id', ctrl.id)
              }
            }
          }
        }

        // Update shift totals (subtract old, add new)
        const { data: shift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', session.shift_id)
          .single()

        if (shift) {
          await supabase
            .from('shifts')
            .update({
              total_cash: (shift.total_cash || 0) - oldCashAmount + newCashAmount,
              total_kaspi: (shift.total_kaspi || 0) - oldKaspiAmount + newKaspiAmount,
              total_games: (shift.total_games || 0) - oldGameCost + newGameCost,
              total_controllers: (shift.total_controllers || 0) - oldControllerCost + newControllerCost,
              total_drinks: (shift.total_drinks || 0) - oldDrinkCost + newDrinkCost
            })
            .eq('id', session.shift_id)
        }

        // Create audit log entry
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_id: shift.cashier_id,
            action_type: 'edit_session',
            target_type: 'session',
            target_id: sessionId,
            shift_id: session.shift_id,
            cashier_name: (session as any).shift?.cashiers?.name || 'Unknown',
            station_name: (session as any).station?.name || 'Unknown',
            old_values: {
              game_cost: oldGameCost,
              controller_cost: oldControllerCost,
              drink_cost: oldDrinkCost,
              total_cost: session.total_cost,
              cash_amount: oldCashAmount,
              kaspi_amount: oldKaspiAmount,
              payment_method: payment.payment_method
            },
            new_values: {
              game_cost: newGameCost,
              controller_cost: newControllerCost,
              drink_cost: newDrinkCost,
              total_cost: newTotalCost,
              cash_amount: newCashAmount,
              kaspi_amount: newKaspiAmount,
              payment_method: newPaymentMethod
            },
            reason: body.reason.trim()
          })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DELETE /admin/sessions/:id - Delete completed session
      if (pathParts.length === 3 && pathParts[1] === 'sessions' && method === 'DELETE') {
        const sessionId = pathParts[2]
        if (!isValidUUID(sessionId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid session ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get reason from query params or body
        let reason = url.searchParams.get('reason') || ''
        if (!reason) {
          try {
            const body = await req.json()
            reason = body.reason || ''
          } catch {}
        }

        if (!reason || reason.trim().length < 5) {
          return new Response(
            JSON.stringify({ error: 'Укажите причину удаления (минимум 5 символов)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get session with all details
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select(`
            id, station_id, shift_id, tariff_type, started_at, ended_at, status,
            game_cost, controller_cost, drink_cost, total_cost, package_count,
            station:stations(id, name),
            shift:shifts(id, cashier_id, cashiers(id, name))
          `)
          .eq('id', sessionId)
          .eq('status', 'completed')
          .single()

        if (sessionError || !session) {
          return new Response(
            JSON.stringify({ error: 'Сессия не найдена' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get payment
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        const oldCashAmount = payment?.cash_amount || 0
        const oldKaspiAmount = payment?.kaspi_amount || 0
        const oldGameCost = session.game_cost || 0
        const oldControllerCost = session.controller_cost || 0
        const oldDrinkCost = session.drink_cost || 0

        // Delete related records
        await supabase.from('payments').delete().eq('session_id', sessionId)
        await supabase.from('session_drinks').delete().eq('session_id', sessionId)
        await supabase.from('controller_usage').delete().eq('session_id', sessionId)
        await supabase.from('sessions').delete().eq('id', sessionId)

        // Update shift totals
        const { data: shift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', session.shift_id)
          .single()

        if (shift) {
          await supabase
            .from('shifts')
            .update({
              total_cash: Math.max(0, (shift.total_cash || 0) - oldCashAmount),
              total_kaspi: Math.max(0, (shift.total_kaspi || 0) - oldKaspiAmount),
              total_games: Math.max(0, (shift.total_games || 0) - oldGameCost),
              total_controllers: Math.max(0, (shift.total_controllers || 0) - oldControllerCost),
              total_drinks: Math.max(0, (shift.total_drinks || 0) - oldDrinkCost)
            })
            .eq('id', session.shift_id)
        }

        // Create audit log entry
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_id: shift.cashier_id,
            action_type: 'delete_session',
            target_type: 'session',
            target_id: sessionId,
            shift_id: session.shift_id,
            cashier_name: (session as any).shift?.cashiers?.name || 'Unknown',
            station_name: (session as any).station?.name || 'Unknown',
            old_values: {
              station_name: (session as any).station?.name,
              tariff_type: session.tariff_type,
              started_at: session.started_at,
              ended_at: session.ended_at,
              game_cost: oldGameCost,
              controller_cost: oldControllerCost,
              drink_cost: oldDrinkCost,
              total_cost: session.total_cost,
              cash_amount: oldCashAmount,
              kaspi_amount: oldKaspiAmount,
              payment_method: payment?.payment_method
            },
            new_values: null,
            reason: reason.trim()
          })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DELETE /admin/drink-sales/:id - Delete drink sale
      if (pathParts.length === 3 && pathParts[1] === 'drink-sales' && method === 'DELETE') {
        const saleId = pathParts[2]
        if (!isValidUUID(saleId)) {
          return new Response(
            JSON.stringify({ error: 'Invalid sale ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get reason from query params or body
        let reason = url.searchParams.get('reason') || ''
        if (!reason) {
          try {
            const body = await req.json()
            reason = body.reason || ''
          } catch {}
        }

        if (!reason || reason.trim().length < 5) {
          return new Response(
            JSON.stringify({ error: 'Укажите причину удаления (минимум 5 символов)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get sale details
        const { data: sale, error: saleError } = await supabase
          .from('drink_sales')
          .select(`
            id, shift_id, drink_id, quantity, total_price,
            payment_method, cash_amount, kaspi_amount, created_at,
            drink:drinks(id, name),
            shift:shifts(id, cashier_id, cashiers(id, name))
          `)
          .eq('id', saleId)
          .single()

        if (saleError || !sale) {
          return new Response(
            JSON.stringify({ error: 'Продажа не найдена' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const oldCashAmount = sale.cash_amount || 0
        const oldKaspiAmount = sale.kaspi_amount || 0
        const oldTotalPrice = sale.total_price || 0

        // Delete sale
        await supabase.from('drink_sales').delete().eq('id', saleId)

        // Update shift totals
        const { data: shift } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', sale.shift_id)
          .single()

        if (shift) {
          await supabase
            .from('shifts')
            .update({
              total_cash: Math.max(0, (shift.total_cash || 0) - oldCashAmount),
              total_kaspi: Math.max(0, (shift.total_kaspi || 0) - oldKaspiAmount),
              total_drinks: Math.max(0, (shift.total_drinks || 0) - oldTotalPrice)
            })
            .eq('id', sale.shift_id)
        }

        // Create audit log entry
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_id: shift.cashier_id,
            action_type: 'delete_drink_sale',
            target_type: 'drink_sale',
            target_id: saleId,
            shift_id: sale.shift_id,
            cashier_name: (sale as any).shift?.cashiers?.name || 'Unknown',
            station_name: null,
            old_values: {
              drink_name: (sale as any).drink?.name,
              quantity: sale.quantity,
              total_price: oldTotalPrice,
              payment_method: sale.payment_method,
              cash_amount: oldCashAmount,
              kaspi_amount: oldKaspiAmount,
              created_at: sale.created_at
            },
            new_values: null,
            reason: reason.trim()
          })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // GET /admin/discount-presets - List all discount presets
      if (path === '/admin/discount-presets' && method === 'GET') {
        const { data, error } = await supabase
          .from('discount_presets')
          .select('*')
          .order('percent')

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка загрузки пресетов скидок' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // POST /admin/discount-presets - Create discount preset
      if (path === '/admin/discount-presets' && method === 'POST') {
        const body = await req.json()
        const percent = parseInt(body.percent)
        if (isNaN(percent) || percent < 1 || percent > 100) {
          return new Response(
            JSON.stringify({ error: 'Процент должен быть от 1 до 100' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('discount_presets')
          .insert({ percent })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Пресет с таким процентом уже существует' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ error: 'Ошибка создания пресета' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // DELETE /admin/discount-presets/:id - Delete discount preset
      if (path.startsWith('/admin/discount-presets/') && method === 'DELETE') {
        const id = path.split('/')[3]
        if (!isValidUUID(id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid preset ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('discount_presets')
          .delete()
          .eq('id', id)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка удаления пресета' }),
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
