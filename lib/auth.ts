import { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getDb } from './db'
import { users } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
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
        const db = getDb()
        try {
          const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
          const user = rows[0] as {
            id: string
            email: string
            passwordHash: string
            role: string
            tenantId: string
          } | undefined
          // TEMP: production-safe debug (no secrets)
          console.log('[auth] lookup', { env: process.env.NODE_ENV, email, found: Boolean(user) })
          if (!user) return null
          const ok = bcrypt.compareSync(password, user.passwordHash)
          console.log('[auth] compare', { ok })
          if (!ok) return null
          return { id: user.id, email: user.email, name: user.email, role: user.role, tenantId: user.tenantId }
        } catch (err) {
          console.error('[auth] error', err instanceof Error ? err.message : err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }): Promise<typeof token> {
      if (user) {
        const u = user as unknown as { role?: string; tenantId?: string }
        token.role = u.role
        token.tenantId = u.tenantId
      }
      return token
    },
    async session({ session, token }): Promise<typeof session> {
      const sUser = session.user as unknown as { role?: string; tenantId?: string }
      sUser.role = token.role as string
      sUser.tenantId = token.tenantId as string
      return session
    },
  },
}


