import { createClient } from '@supabase/supabase-js'

export const handler = async (event: any) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL as string
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Service not configured' }) }
    }
    const body = event.body ? JSON.parse(event.body) : {}
    const tripId = body?.trip_id
    const vehicleId = body?.vehicle_id
    if (!tripId || !vehicleId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing trip_id or vehicle_id' }) }
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.from('trip_vehicles').delete().eq('trip_id', tripId).eq('vehicle_id', vehicleId)
    if (error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Internal error' }) }
  }
}

