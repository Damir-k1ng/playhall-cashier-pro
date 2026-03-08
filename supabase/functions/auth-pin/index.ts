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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Rate limiting storage (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>()
const RATE_LIMIT_WINDOW = 300000 // 5 minutes
const MAX_ATTEMPTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)
  
  if (!attempts || (now - attempts.firstAttempt) > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
    return true
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false
  }
  
  attempts.count++
  return true
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Слишком много попыток. Попробуйте позже.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, pin, session_token } = await req.json()

    if (action === 'login') {
      // Validate PIN format
      if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ error: 'Неверный PIN' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find cashier by PIN
      const { data: cashier, error: cashierError } = await supabase
        .from('users')
        .select('id, name, tenant_id, role')
        .eq('pin_code', pin)
        .eq('role', 'cashier')
        .single()

      if (cashierError || !cashier) {
        return new Response(
          JSON.stringify({ error: 'Неверный PIN' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Set user role
      const userRole = cashier.role === 'club_admin' || cashier.role === 'platform_owner' ? 'admin' : 'cashier'
      const isAdmin = userRole === 'admin'

      // Map pin_code to pin for backward compatibility with client type
      const mappedCashier = { ...cashier, pin: cashier.pin_code, pin_code: undefined }

      // Check for existing active shift for this cashier in this tenant
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('cashier_id', cashier.id)
        .eq('tenant_id', cashier.tenant_id)
        .eq('is_active', true)
        .single()

      if (existingShift) {
        // If shift exists but has no token, generate one
        let sessionToken = existingShift.session_token
        if (!sessionToken) {
          sessionToken = crypto.randomUUID()
          await supabase
            .from('shifts')
            .update({ session_token: sessionToken })
            .eq('id', existingShift.id)
        }

        return new Response(
          JSON.stringify({
            cashier: mappedCashier,
            shift: { ...existingShift, session_token: sessionToken },
            session_token: sessionToken,
            role: userRole
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
          tenant_id: cashier.tenant_id,
          is_active: true,
          session_token: newSessionToken,
          is_admin_session: isAdmin
        })
        .select()
        .single()

      if (shiftError) {
        console.error('Shift creation error:', shiftError)
        return new Response(
          JSON.stringify({ error: 'Ошибка создания смены' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          cashier: mappedCashier,
          shift: newShift,
          session_token: newSessionToken,
          role: userRole
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'validate') {
      if (!session_token || typeof session_token !== 'string') {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: shift } = await supabase
        .from('shifts')
        .select('*, users!shifts_cashier_id_fkey(*)')
        .eq('session_token', session_token)
        .eq('is_active', true)
        .single()

      if (!shift) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const cashierData = shift.users;
      const userRole = cashierData?.role === 'club_admin' || cashierData?.role === 'platform_owner' ? 'admin' : 'cashier';
      const mappedCashier = cashierData ? { ...cashierData, pin: cashierData.pin_code, pin_code: undefined } : null;

      return new Response(
        JSON.stringify({
          valid: true,
          cashier: mappedCashier,
          shift: { ...shift, users: undefined },
          role: userRole
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

      // Only deactivate the shift — don't nullify session_token
      // This prevents other devices using the same cashier from losing their session
      await supabase
        .from('shifts')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
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
    console.error('Auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(null), 'Content-Type': 'application/json' } }
    )
  }
})
