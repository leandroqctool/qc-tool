import type { ZodError } from 'zod'
export class APIError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
  }
}

export function jsonError(error: unknown, fallback = 'Internal server error', status = 500) {
  // Zod validation errors → 400 with structured issues
  if (isZodError(error)) {
    const issues = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return Response.json({ error: 'Invalid input', issues }, { status: 400 })
  }
  if (error instanceof APIError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : fallback
  return Response.json({ error: message }, { status })
}

function isZodError(err: unknown): err is ZodError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'issues' in (err as Record<string, unknown>) &&
    Array.isArray((err as { issues?: unknown }).issues)
  )
}


