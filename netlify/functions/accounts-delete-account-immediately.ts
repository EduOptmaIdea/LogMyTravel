import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'

export const handler = async (event: any) => {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Missing access token' }) }

    const supabaseUrl = process.env.SUPABASE_URL as string
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
    if (!supabaseUrl || !serviceKey) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Supabase service not configured' }) }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: userData, error: getUserErr } = await supabase.auth.getUser(token)
    if (getUserErr || !userData?.user?.id) return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Invalid token' }) }
    const uid = userData.user.id
    const userEmail = userData.user.email || undefined

    // Optional: export backup before delete
    try {
      if (userEmail) {
        const tables = ['trip_vehicle_segments','trip_vehicles','stops','trips','vehicles','profiles']
        const payload: Record<string, any> = {}
        for (const t of tables) {
          try {
            const col = t === 'profiles' ? 'id' : 'user_id'
            const { data } = await supabase.from(t).select('*').eq(col, t === 'profiles' ? uid : uid)
            payload[t] = data || []
          } catch {
            payload[t] = []
          }
        }
        const host = process.env.SMTP_HOST as string
        const port = Number(process.env.SMTP_PORT || '465')
        const user = process.env.SMTP_USERNAME as string
        const pass = process.env.SMTP_PASSWORD as string
        const from = (process.env.SMTP_FROM as string) || user
        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
        await transporter.sendMail({
          from,
          to: userEmail,
          subject: 'Backup dos seus dados – LogMyTravel',
          text: 'Em anexo seus dados em JSON. A exclusão será realizada em seguida.',
          attachments: [{ filename: 'logmytravel_backup.json', content: Buffer.from(JSON.stringify(payload, null, 2)), contentType: 'application/json' }]
        })
      }
    } catch {}

    const tables = ['trip_vehicle_segments','trip_vehicles','stops','trips','vehicles']
    for (const t of tables) { try { await supabase.from(t).delete().eq('user_id', uid) } catch {} }
    try { await supabase.from('profiles').delete().eq('id', uid) } catch {}

    // Confirmation email
    if (userEmail) {
      try {
        const host = process.env.SMTP_HOST as string
        const port = Number(process.env.SMTP_PORT || '465')
        const user = process.env.SMTP_USERNAME as string
        const pass = process.env.SMTP_PASSWORD as string
        const from = (process.env.SMTP_FROM as string) || user
        const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
        let html: string | undefined
        try {
          const cwd = process.cwd()
          const htmlPath = path.resolve(cwd, 'supabase_templates', 'account_deleted_pt-br.html')
          html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf-8') : undefined
        } catch {}
        const text = html ? undefined : 'Sua conta no LogMyTravel foi excluída com sucesso.'
        await transporter.sendMail({ from, to: userEmail, subject: 'Conta excluída – LogMyTravel', html, text })
      } catch {}
    }

    const { error: delErr } = await supabase.auth.admin.deleteUser(uid)
    if (delErr) return { statusCode: 500, body: JSON.stringify({ ok: false, error: delErr.message || 'Failed to delete user' }) }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Failed' }) }
  }
}

