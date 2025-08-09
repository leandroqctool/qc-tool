const { neon } = require('@neondatabase/serverless')

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL')
    process.exit(1)
  }
  const sql = neon(databaseUrl)
  const rows = await sql`
    select email, role, length(password_hash) as hash_len
    from users
    where email = ${'god@god.com.au'}
  `
  console.log(JSON.stringify(rows, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


