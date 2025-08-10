import { drizzle } from 'drizzle-orm/neon-http'
import { neon, neonConfig } from '@neondatabase/serverless'
import * as schema from '../drizzle/schema'
import { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { eq, desc } from 'drizzle-orm'
import dns from 'node:dns'

// Improve stability for serverless/edge-like environments
neonConfig.fetchConnectionCache = true
// @ts-ignore - fetchTimeout is available but not in types
neonConfig.fetchTimeout = 60000 // Increase to 60 seconds

// Prefer IPv4 DNS results in Node (Node 18+)
try {
  // @ts-ignore Node types may vary by version
  dns.setDefaultResultOrder('ipv4first')
} catch (_) {
  // ignore if not supported
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 200, maxDelay = 2000 } = {}
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= retries) break
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt) * (0.5 + Math.random()), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Define a custom type that includes schema and operators
type DbWithSchema = NeonHttpDatabase<typeof schema> & {
  schema: typeof schema;
  operators: {
    eq: typeof eq;
    desc: typeof desc;
  };
};

export function getDb(): DbWithSchema {
  // Allow opting into unpooled in local/dev if pooler times out
  const useUnpooled = process.env.DB_USE_UNPOOLED === 'true'
  const pooledUrl = process.env.DATABASE_URL
  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED
  const url = useUnpooled && unpooledUrl ? unpooledUrl : pooledUrl
  if (!url) throw new Error('DATABASE_URL not set')
  
  // Use the standard neon client
  const client = neon(url)
  
  // Create a drizzle instance and attach helpers without breaking its prototype
  const dbBase = drizzle(client, { schema }) as unknown as DbWithSchema
  Object.assign(dbBase, { schema, operators: { eq, desc } })
  return dbBase
}


