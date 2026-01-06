import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
}

async function validateSession(supabase: any, sessionToken: string | null) {
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const sessionToken = req.headers.get('x-session-token')
    const shift = await validateSession(supabase, sessionToken)

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
    // GET /stations - Get all stations with active sessions
    if (path === '/stations' && method === 'GET') {
      const { data: stations } = await supabase.from('stations').select('*').order('station_number')
      
      const { data: activeSessions } = await supabase
        .from('sessions')
        .select('*, controller_usage(*), session_drinks(*, drinks(*))')
        .eq('status', 'active')

      const { data: activeReservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('is_active', true)

      const { data: activeBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'booked')
        .eq('booking_date', new Date().toISOString().split('T')[0])

      const stationsWithData = stations?.map(station => ({
        ...station,
        activeSession: activeSessions?.find(s => s.station_id === station.id) || null,
        activeReservation: activeReservations?.find(r => r.station_id === station.id) || null,
        activeBooking: activeBookings?.find(b => b.station_id === station.id) || null
      }))

      return new Response(
        JSON.stringify(stationsWithData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // POST /sessions - Create session
    if (path === '/sessions' && method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('sessions')
        .insert({ ...body, shift_id: shift.id })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH /sessions/:id - Update session
    if (path.startsWith('/sessions/') && method === 'PATCH') {
      const id = path.split('/')[2]
      const body = await req.json()
      const { data, error } = await supabase
        .from('sessions')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /payments - Create payment
    if (path === '/payments' && method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...body, shift_id: shift.id })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update shift totals
      await supabase.rpc('update_shift_totals', { shift_id: shift.id })

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /controller-usage - Create controller usage
    if (path === '/controller-usage' && method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('controller_usage')
        .insert(body)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      const body = await req.json()
      const { data, error } = await supabase
        .from('controller_usage')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      const { data, error } = await supabase
        .from('session_drinks')
        .insert(body)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /drink-sales - Sell drink
    if (path === '/drink-sales' && method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('drink_sales')
        .insert({ ...body, shift_id: shift.id })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST /reservations - Create reservation
    if (path === '/reservations' && method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabase
        .from('reservations')
        .insert({ ...body, shift_id: shift.id })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      const body = await req.json()
      const { data, error } = await supabase
        .from('reservations')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      const { data, error } = await supabase
        .from('bookings')
        .insert(body)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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
      const body = await req.json()
      const { data, error } = await supabase
        .from('bookings')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
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

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
