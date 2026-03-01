/**
 * Test Supabase Auth email sending — triggers a password reset email
 * through Supabase's GoTrue, which uses the configured SMTP settings.
 *
 * Usage:
 *   npx tsx scripts/test-supabase-email.ts
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TO = 'mbari.home@gmail.com'

async function main() {
  console.log('=== Supabase Auth Email Test ===')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`To:       ${TO}`)
  console.log()

  // Use the GoTrue /recover endpoint (password reset)
  // This triggers Supabase to send an email through its configured SMTP
  console.log('1. Calling Supabase GoTrue /recover endpoint...')
  const start = Date.now()

  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TO,
    }),
  })

  const duration = Date.now() - start
  const body = await res.text()

  console.log(`   Status:   ${res.status}`)
  console.log(`   Duration: ${duration}ms`)
  console.log(`   Body:     ${body}`)
  console.log()

  if (duration > 5000) {
    console.log('   WARNING: Duration > 5s — likely SMTP timeout!')
    console.log('   The Supabase SMTP config is probably not connecting.')
  } else if (res.ok) {
    console.log('   OK — Request completed quickly.')
    console.log(`   Check inbox at ${TO} for a password reset email.`)
  } else {
    console.log('   FAILED — Supabase returned an error.')
  }
}

main().catch(console.error)
