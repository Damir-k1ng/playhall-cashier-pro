import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, pin, session_token } = await req.json()

    if (action === 'login') {
      if (!pin || pin.length !== 4) {
        return new Response(
          JSON.stringify({ error: 'Неверный PIN' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find cashier by PIN
      const { data: cashier, error: cashierError } = await supabase
        .from('cashiers')
        .select('id, name')
        .eq('pin', pin)
        .single()

      if (cashierError || !cashier) {
        return new Response(
          JSON.stringify({ error: 'Неверный PIN' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check for existing active shift
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('cashier_id', cashier.id)
        .eq('is_active', true)
        .single()

      if (existingShift) {
        return new Response(
          JSON.stringify({
            cashier,
            shift: existingShift,
            session_token: existingShift.session_token
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create new shift with session token
      const newSessionToken = crypto.randomUUID()
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          cashier_id: cashier.id,
          is_active: true,
          session_token: newSessionToken
        })
        .select()
        .single()

      if (shiftError) {
        return new Response(
          JSON.stringify({ error: 'Ошибка создания смены' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get cashier role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('cashier_id', cashier.id)
        .single()

      return new Response(
        JSON.stringify({
          cashier,
          shift: newShift,
          session_token: newSessionToken,
          role: roleData?.role || 'cashier'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: shift } = await supabase
        .from('shifts')
        .select('*, cashiers(*)')
        .eq('session_token', session_token)
        .eq('is_active', true)
        .single()

      if (!shift) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('cashier_id', shift.cashier_id)
        .single()

      return new Response(
        JSON.stringify({
          valid: true,
          cashier: shift.cashiers,
          shift: { ...shift, cashiers: undefined },
          role: roleData?.role || 'cashier'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'logout') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase
        .from('shifts')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          session_token: null
        })
        .eq('session_token', session_token)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
