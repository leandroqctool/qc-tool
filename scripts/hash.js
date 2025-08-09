// Simple bcrypt hash utility
// Usage: node scripts/hash.js "yourPassword"
const bcrypt = require('bcryptjs')

const password = process.argv[2]
if (!password) {
  console.error('Missing password argument')
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 12)
process.stdout.write(hash)


