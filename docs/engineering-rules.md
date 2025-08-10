### QC Tool – Engineering Rules and Lessons

This document captures what we learned from recent build/runtime issues and defines rules to avoid regressions. It reflects our current stack: Next.js 15 (App Router), TypeScript, Tailwind v4, NextAuth (Credentials), Neon (Postgres) with Drizzle, Cloudflare R2 (AWS SDK v3 + presigned URLs), Zod, Vercel.

### Stack and architecture
- **Framework**: Next.js 15 (App Router, RSC). Node runtime for API routes unless explicitly needed otherwise.
- **Auth**: NextAuth (Credentials provider) – invite-only access.
- **DB**: Neon Postgres. Drizzle ORM for most CRUD paths; direct Neon client for short/critical queries where pool timeouts may occur.
- **Storage**: Cloudflare R2 via AWS SDK v3 and presigned URLs.
- **Validation**: Zod for all inputs.
- **Styling**: Tailwind v4 with design tokens.

### Authentication rules
- **NEXTAUTH_URL must be correct** per environment (localhost vs production). Mismatch causes 401 during callback.
- **Use unpooled connection for authorize()** to reduce pooler timeouts:
  - Set timeout with a safe cast: `(neonConfig as unknown as { fetchTimeout?: number }).fetchTimeout = 30000`.
  - Use `process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL`.
- **Typed results from Neon**: Avoid `sql<...>` generics (TS complains in CI). Instead cast the result array:
  - `const rows = (await sql\`...\`) as unknown as RowType[]`.
- **No dev-only tenant fallbacks** (e.g., zero GUID). Always require a real `tenantId` from DB.

### Database usage rules
- **Do not wrap the Neon client** with custom functions that change its shape. Wrapping breaks Drizzle’s prototype methods (e.g., `db.select is not a function`).
- **Create Drizzle DB normally** and attach helpers without losing prototype:
  - `const dbBase = drizzle(client, { schema }) as DbWithSchema;`
  - `Object.assign(dbBase, { schema, operators: { eq, desc } });`
- **Prefer Drizzle query builder** for standard CRUD (use `eq`, `desc`). Avoid raw `sql` unless necessary.
- **Handle pool issues**:
  - Allow `DB_USE_UNPOOLED=true` to switch to unpooled Neon URL.
  - Prefer IPv4 DNS when needed: `NODE_OPTIONS=--dns-result-order=ipv4first` (or `dns.setDefaultResultOrder('ipv4first')`).
- **Keep queries simple** in API routes; avoid long transactions.

### API routes and RSC data fetching
- **From Server Components**, construct absolute URLs for internal API calls (relative URLs can fail under RSC):
  - Build base from `headers()` (host + protocol) and use fetch against absolute URL.
- **Centralized error handling** in routes; return clear messages in 400/401/500 responses.

### Cloudflare R2 rules
- **Endpoint/host style must match**:
  - If using account host (`{account_id}.eu.r2.cloudflarestorage.com`), set `forcePathStyle: true` in the S3 client.
  - If using bucket host (`{bucket}.{account_id}.eu.r2.cloudflarestorage.com`), path style is not needed. Ensure you don’t accidentally double the bucket in host (`uploads.uploads...`).
- **Presigned URLs**:
  - Exclude checksum headers from the signature (e.g., `x-amz-checksum-crc32`, `x-amz-sdk-checksum-algorithm`) via `unsignableHeaders` to avoid signature mismatch.
  - Use `UNSIGNED-PAYLOAD` for browser uploads and pass a matching `Content-Type` in the PUT request.
- **CORS**:
  - Allow at least methods `GET, HEAD, PUT, POST, OPTIONS` and the necessary headers (`Content-Type`, `Authorization`, `x-amz-*`, etc.).
  - Ensure the bucket CORS includes your app origins. Missing `Access-Control-Allow-Origin` blocks uploads.
- **Operational pattern**:
  - Return presigned URL fast; persist metadata in a separate confirm endpoint to avoid DB timeouts blocking uploads.

### TypeScript and linting rules
- **No `any`** and no unused imports/variables. CI treats these as errors.
- **Avoid `@ts-ignore` / `@ts-expect-error`**. Use narrow type assertions instead.
- **Do not use generics with Neon template tags** in CI (causes `Expected 0 type arguments, but got 1.`). Cast the evaluated result instead.

### Environment variable rules
- **Canonical DB vars** used in code: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`.
- **R2 vars**: `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`.
- **Local vs prod**: `.env.local` for local, Vercel Project settings for prod. Keep values consistent; don’t keep conflicting `POSTGRES_*` and `DATABASE_*` in use at the same time.

### Dev workflow rules
- **Restarting dev server**: Kill any stray Next.js processes and clear `.next` cache before re-running dev when it gets stuck. Use `scripts/dev-clean.sh` and always stop existing servers first [[memory:5689326]].
- **Pre-commit / pre-deploy**:
  - `npm run build` locally must succeed.
  - Fix all lint/type errors; remove unused imports.
  - Validate internal API calls from RSC with absolute URLs.
  - Sanity check R2 CORS and presign config after bucket/region changes.
- **CI gotchas**:
  - If Vercel deploys an old commit, trigger a redeploy or push a no-op commit.

### Common error patterns and fixes
- **`Property 'fetchTimeout' does not exist on type 'typeof neonConfig'`** → Use safe cast to set timeout.
- **`Type error: Expected 0 type arguments, but got 1.` on `sql<...>`** → Remove generic; cast evaluated result.
- **`db.schema is undefined` or `db.select is not a function`** → Don’t reconstruct/wrap the Drizzle instance; attach fields with `Object.assign`.
- **`Failed to parse URL from /api/...` from RSC** → Use absolute URLs.
- **R2 `SignatureDoesNotMatch`** → Ensure host style and headers match presign; exclude checksum headers; correct bucket/host.
- **R2 CORS preflight blocked** → Add `OPTIONS` and necessary CORS headers on the bucket; ensure `Access-Control-Allow-Origin` is returned.
- **`ConnectTimeoutError` from Neon** → Increase `fetchTimeout`, use unpooled URL for short queries, prefer IPv4 DNS.

### Commit checklist
- Build passes locally: `npm run build`.
- No ESLint/TS errors; no `any`/unused/ts-ignore.
- Auth login tested (correct `NEXTAUTH_URL`).
- DB connectivity ok (pooled/unpooled) and queries typed.
- R2 uploads tested (presigned/direct), CORS confirmed.
- Absolute URLs used from Server Components.


