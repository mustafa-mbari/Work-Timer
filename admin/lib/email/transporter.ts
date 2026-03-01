import nodemailer from 'nodemailer'

export function getTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.eu',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
  })
}

export function getFromAddress() {
  const name = process.env.SMTP_FROM_NAME || 'Work Timer'
  const email = process.env.SMTP_FROM_EMAIL || 'info@w-timer.com'
  return `"${name}" <${email}>`
}

export async function verifyConnection(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'SMTP connection failed',
    }
  }
}
