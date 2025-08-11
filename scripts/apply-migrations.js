/*
  Apply Drizzle SQL migrations to Neon using the unpooled URL if available.
  Runs each statement separately to avoid multi-statement limitations.
*/
/* eslint-disable no-console */
const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

async function run() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!url) {
    console.error('Missing DATABASE_URL(_UNPOOLED)')
    process.exit(1)
  }
  const sql = neon(url)

  const files = [
    path.join(process.cwd(), 'drizzle/migrations/0003_qc_reviews.sql'),
    path.join(process.cwd(), 'drizzle/migrations/0004_audit_logs.sql'),
  ]

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.warn('Skip missing migration:', file)
      continue
    }
    const raw = fs.readFileSync(file, 'utf8')
    console.log('Applying', path.basename(file))
    // Split into individual statements; naive split on semicolon newlines
    const statements = raw
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const stmt of statements) {
      // Use unsafe to send raw SQL
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await sql.unsafe(stmt)
    }
    console.log('Applied', path.basename(file))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})


