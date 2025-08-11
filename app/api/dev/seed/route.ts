import { getDb } from '../../../../lib/db'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (process.env.ALLOW_DEV_SEED !== 'true') {
      return Response.json({ error: 'Set ALLOW_DEV_SEED=true to enable' }, { status: 403 })
    }

    const db = getDb()
    const { tenants, users } = db.schema

    // Upsert a dev tenant
    const tenantName = process.env.DEV_SEED_TENANT_NAME || 'Dev Tenant'
    // Try to find an existing tenant by name (raw simple select)
    const existingTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, tenantName))
      .limit(1)
      .catch(() => [])

    let tenantId: string
    if (existingTenants && existingTenants.length > 0) {
      tenantId = (existingTenants[0] as { id: string }).id
    } else {
      const createdTenant = await db.insert(tenants).values({ name: tenantName }).returning()
      tenantId = createdTenant[0].id as unknown as string
    }

    const email = process.env.DEV_SEED_EMAIL || 'admin@example.com'
    const plainPassword = process.env.DEV_SEED_PASSWORD || 'Password123!'

    // Best-effort: ensure unique email per migrations constraint
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .catch(() => [])

    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ ok: true, tenantId, email, note: 'User already exists' })
    }

    const passwordHash = bcrypt.hashSync(plainPassword, 10)

    const created = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'TENANT_ADMIN',
        tenantId: tenantId as unknown as string,
      })
      .returning()

    return Response.json({ ok: true, tenantId, userId: created[0].id, email, password: plainPassword })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Seed failed'
    return Response.json({ error: message }, { status: 500 })
  }
}


