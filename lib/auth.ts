import { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { neon, neonConfig } from '@neondatabase/serverless'
import { loginSchema } from './validation'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds) return null
        const { email, password } = loginSchema.parse(creds)
        try {
          // Prefer an unpooled Neon endpoint for this short auth query to avoid pool timeouts in local/dev
          const authUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
          if (!authUrl) throw new Error('DATABASE_URL not set')
          ;(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000
          const sql = neon(authUrl)
          type DbRow = { id: string; email: string; password_hash: string; role: string; tenant_id: string }
          const rows = (await sql`
            select id, email, password_hash, role, tenant_id from users where email = ${email} limit 1
          `) as unknown as DbRow[]
          const user = rows[0] && ({
            id: rows[0].id,
            email: rows[0].email,
            passwordHash: rows[0].password_hash,
            role: rows[0].role,
            tenantId: rows[0].tenant_id,
          }) as {
            id: string
            email: string
            passwordHash: string
            role: string
            tenantId: string
          } | undefined
          if (!user) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('[auth][authorize] user not found', { email })
            }
            return null
          }
          const ok = bcrypt.compareSync(password, user.passwordHash)
          if (!ok) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('[auth][authorize] password mismatch', { email })
            }
            return null
          }
          return { id: user.id, email: user.email, name: user.email, role: user.role, tenantId: user.tenantId }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('[auth][authorize] error', err)
          }
          // Remove dev fallback that injected zero-tenant to avoid bad tenantId in session
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<typeof token> {
      if (user) {
        const u = user as unknown as { id?: string; role?: string; tenantId?: string }
        token.userId = u.id
        token.role = u.role
        token.tenantId = u.tenantId
      }
      return token
    },
    async session({ session, token }): Promise<typeof session> {
      const sUser = session.user as unknown as { id?: string; role?: string; tenantId?: string }
      sUser.id = token.userId as string
      sUser.role = token.role as string
      sUser.tenantId = token.tenantId as string
      return session
    },
  },
}


