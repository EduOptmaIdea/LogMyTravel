import { createClient } from '@supabase/supabase-js'

export const handler = async (event: any) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const email = (body?.email as string || '').trim().toLowerCase()
    if (!email) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing 'email'" }) }

    const supabaseUrl = process.env.SUPABASE_URL as string
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceKey) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase service not configured' }) }

    const supabase = createClient(supabaseUrl, serviceKey)
    // Check in auth.users with service role
    const { data, error } = await supabase.from('auth.users' as any).select('id').eq('email', email).limit(1)
    if (error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    const exists = Array.isArray(data) && data.length > 0
    return { statusCode: 200, body: JSON.stringify({ ok: true, exists }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Failed' }) }
  }
}

