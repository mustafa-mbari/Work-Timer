/**
 * Real SMTP connection test — verifies Resend SMTP credentials work.
 * Uses Node.js native tls module (no nodemailer dependency).
 *
 * Usage:
 *   npx tsx scripts/test-smtp.ts
 *
 * Reads SMTP config from web/.env.local
 */
import * as tls from 'node:tls'
import * as net from 'node:net'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env vars from web/.env.local
function loadEnv() {
  const envPath = resolve(__dirname, '../web/.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    const value = trimmed.slice(eqIdx + 1)
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnv()

const host = process.env.SMTP_HOST || 'smtp.resend.com'
const port = Number(process.env.SMTP_PORT) || 465
const user = process.env.SMTP_USER || ''
const pass = process.env.SMTP_PASS || ''
const fromEmail = process.env.SMTP_FROM_EMAIL || 'info@w-timer.com'
const fromName = process.env.SMTP_FROM_NAME || 'Work Timer'
const toEmail = 'mbari.home@gmail.com'

console.log('=== SMTP Connection Test ===')
console.log(`Host:  ${host}`)
console.log(`Port:  ${port}`)
console.log(`User:  ${user}`)
console.log(`From:  "${fromName}" <${fromEmail}>`)
console.log(`To:    ${toEmail}`)
console.log()

if (!user || !pass) {
  console.error('ERROR: SMTP_USER or SMTP_PASS not set')
  process.exit(1)
}

function sendCommand(socket: net.Socket | tls.TLSSocket, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for response to: ${cmd}`)), 10000)
    socket.once('data', (data: Buffer) => {
      clearTimeout(timeout)
      resolve(data.toString())
    })
    socket.write(cmd + '\r\n')
  })
}

function waitForResponse(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for server greeting')), 10000)
    socket.once('data', (data: Buffer) => {
      clearTimeout(timeout)
      resolve(data.toString())
    })
  })
}

async function main() {
  console.log('1. Connecting to SMTP server...')

  const socket = tls.connect({
    host,
    port,
    rejectUnauthorized: true,
  })

  socket.setTimeout(15000)

  try {
    // Wait for greeting
    const greeting = await waitForResponse(socket)
    console.log(`   Server: ${greeting.trim()}`)

    if (!greeting.startsWith('220')) {
      throw new Error(`Unexpected greeting: ${greeting}`)
    }
    console.log('   OK — Connected\n')

    // EHLO
    console.log('2. Sending EHLO...')
    const ehlo = await sendCommand(socket, `EHLO w-timer.com`)
    if (!ehlo.includes('250')) {
      throw new Error(`EHLO failed: ${ehlo}`)
    }
    console.log('   OK — EHLO accepted\n')

    // AUTH LOGIN
    console.log('3. Authenticating...')
    const authResp = await sendCommand(socket, 'AUTH LOGIN')
    if (!authResp.startsWith('334')) {
      throw new Error(`AUTH LOGIN failed: ${authResp}`)
    }

    const userResp = await sendCommand(socket, Buffer.from(user).toString('base64'))
    if (!userResp.startsWith('334')) {
      throw new Error(`Username rejected: ${userResp}`)
    }

    const passResp = await sendCommand(socket, Buffer.from(pass).toString('base64'))
    if (!passResp.startsWith('235')) {
      throw new Error(`Authentication failed: ${passResp}`)
    }
    console.log('   OK — Authenticated\n')

    // MAIL FROM
    console.log('4. Sending test email...')
    const mailFrom = await sendCommand(socket, `MAIL FROM:<${fromEmail}>`)
    if (!mailFrom.startsWith('250')) {
      throw new Error(`MAIL FROM rejected: ${mailFrom}`)
    }

    // RCPT TO
    const rcptTo = await sendCommand(socket, `RCPT TO:<${toEmail}>`)
    if (!rcptTo.startsWith('250')) {
      throw new Error(`RCPT TO rejected: ${rcptTo}`)
    }

    // DATA
    const dataResp = await sendCommand(socket, 'DATA')
    if (!dataResp.startsWith('354')) {
      throw new Error(`DATA rejected: ${dataResp}`)
    }

    const now = new Date().toISOString()
    const message = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: ${toEmail}`,
      `Subject: [Work Timer] SMTP Test - ${now}`,
      `Content-Type: text/html; charset=utf-8`,
      `Date: ${new Date().toUTCString()}`,
      '',
      `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:20px">`,
      `<h2 style="color:#6366f1">SMTP Test Successful</h2>`,
      `<p>Your Resend SMTP configuration is working correctly.</p>`,
      `<table style="border-collapse:collapse;width:100%;margin:16px 0">`,
      `<tr><td style="padding:8px;border:1px solid #e7e5e4;font-weight:600">Host</td><td style="padding:8px;border:1px solid #e7e5e4">${host}</td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e7e5e4;font-weight:600">Port</td><td style="padding:8px;border:1px solid #e7e5e4">${port}</td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e7e5e4;font-weight:600">From</td><td style="padding:8px;border:1px solid #e7e5e4">${fromEmail}</td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e7e5e4;font-weight:600">Sent at</td><td style="padding:8px;border:1px solid #e7e5e4">${now}</td></tr>`,
      `</table>`,
      `<p style="color:#78716c;font-size:14px">Sent from Work Timer SMTP test script.</p>`,
      `</div>`,
    ].join('\r\n')

    const sendResp = await sendCommand(socket, message + '\r\n.')
    if (!sendResp.startsWith('250')) {
      throw new Error(`Message rejected: ${sendResp}`)
    }

    console.log('   OK — Email sent!')
    console.log(`   Response: ${sendResp.trim()}\n`)

    // QUIT
    await sendCommand(socket, 'QUIT')
    socket.end()

    console.log(`Check inbox at ${toEmail}`)
  } catch (err) {
    console.error(`\n   FAILED: ${err instanceof Error ? err.message : err}`)
    socket.end()
    process.exit(1)
  }
}

main()
