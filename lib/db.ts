import { drizzle } from 'drizzle-orm/neon-http'
import { neon, neonConfig } from '@neondatabase/serverless'
import * as schema from '../drizzle/schema'
import { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { eq, desc } from 'drizzle-orm'
import dns from 'node:dns'

// Improve stability for serverless/edge-like environments
neonConfig.fetchConnectionCache = true
// Cast to any to access property not in types
;(neonConfig as any).fetchTimeout = 60000 // Increase to 60 seconds

// Prefer IPv4 DNS results in Node (Node 18+)
try {
  (dns as unknown as { setDefaultResultOrder?: (order: string) => void }).setDefaultResultOrder?.('ipv4first')
} catch {
  // ignore if not supported
}

// removed unused withRetry helper

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


