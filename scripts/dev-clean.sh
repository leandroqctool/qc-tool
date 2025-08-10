#!/usr/bin/env bash
set -euo pipefail

echo "Stopping any running Next.js dev servers on 3000/3001..."
pkill -f "next dev" >/dev/null 2>&1 || true
lsof -ti tcp:3000 | xargs -r kill -9 || true
lsof -ti tcp:3001 | xargs -r kill -9 || true

echo "Clearing .next cache..."
rm -rf .next

echo "Ensuring NEXTAUTH_URL=http://localhost:3000 in .env.local..."
touch .env.local
if grep -q '^NEXTAUTH_URL=' .env.local; then
  # macOS BSD sed requires backup suffix arg
  sed -i '' 's#^NEXTAUTH_URL=.*#NEXTAUTH_URL=http://localhost:3000#' .env.local
else
  echo 'NEXTAUTH_URL=http://localhost:3000' >> .env.local
fi

echo "Starting Next.js on http://localhost:3000..."
npm run dev --silent

