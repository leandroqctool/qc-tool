type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function enforceRateLimit(key: string, max: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const row = store.get(key)
  if (!row || row.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { ok: true, remaining: max - 1, resetAt }
  }
  if (row.count < max) {
    row.count += 1
    return { ok: true, remaining: max - row.count, resetAt: row.resetAt }
  }
  return { ok: false, remaining: 0, resetAt: row.resetAt }
}


