import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
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

  return transporter
}

export function getFromAddress() {
  const name = process.env.SMTP_FROM_NAME || 'Work Timer'
  const email = process.env.SMTP_FROM_EMAIL || 'info@w-timer.com'
  return `"${name}" <${email}>`
}
