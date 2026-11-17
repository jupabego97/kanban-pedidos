#!/usr/bin/env bash
# Idempotent dependency refresh for the kanban-pedidos Cloud Agent environment.
# Installs system PostgreSQL, Node dependencies, and writes a local .env that
# points the app at the local Postgres instance managed by .cursor/start.sh.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql postgresql-contrib
fi

npm ci

# Local development env file (gitignored). Connection strings use "localhost"
# so src/lib/server/db.js disables SSL. The primary DB schema is auto-created by
# the app at runtime; the catalog DB is seeded by .cursor/start.sh.
if [ ! -f .env ]; then
  cat > .env <<'ENV'
DATABASE_PUBLIC_URL=postgresql://kanban:kanban@localhost:5432/kanban
DATABASE_CATALOGO_URL=postgresql://kanban:kanban@localhost:5432/catalogo
ENV
fi

echo "install: done"
