import { createClient } from '@supabase/supabase-js'

export const handler = async (event: any) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL as string
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Service not configured' }) }
    }
    const payload = event.body ? JSON.parse(event.body) : {}
    const id = payload?.id
    const updates = payload?.updates
    if (!id || !updates || typeof updates !== 'object') {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing id or updates' }) }
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, data }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Internal error' }) }
  }
}

