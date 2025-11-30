import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'node:path'

export const handler = async (event: any) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const to = body?.to as string
    if (!to) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing 'to'" }) }

    const host = process.env.SMTP_HOST as string
    const port = Number(process.env.SMTP_PORT || '465')
    const user = process.env.SMTP_USERNAME as string
    const pass = process.env.SMTP_PASSWORD as string
    const from = (process.env.SMTP_FROM as string) || user
    if (!host || !user || !pass || !from) return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'SMTP config missing' }) }

    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    let html: string | undefined
    try {
      const cwd = process.cwd()
      const htmlPath = path.resolve(cwd, 'supabase_templates', 'password_changed_pt-br.html')
      html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf-8') : undefined
    } catch {}
    const text = html ? undefined : [
      'Olá,',
      '',
      'Sua senha no LogMyTravel foi alterada recentemente.',
      'Se não foi você, reconfigure sua senha imediatamente e entre em contato com o suporte.',
      '',
      'Atenciosamente,',
      'Equipe LogMyTravel',
    ].join('\n')

    await transporter.sendMail({ from, to, subject: 'Senha alterada – LogMyTravel', html, text })
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (e: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e?.message || 'Failed' }) }
  }
}

