#!/usr/bin/env bash
# Per-boot reconciliation for the kanban-pedidos environment: starts PostgreSQL,
# ensures the app role/databases exist, and seeds the catalog database used for
# product autocomplete and provider lookups. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

PG_VERSION="$(ls /usr/lib/postgresql/ 2>/dev/null | sort -n | tail -1)"
: "${PG_VERSION:=16}"

sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='kanban'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE kanban LOGIN PASSWORD 'kanban';"

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='kanban'" | grep -q 1 \
  || sudo -u postgres createdb -O kanban kanban

sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='catalogo'" | grep -q 1 \
  || sudo -u postgres createdb -O kanban catalogo

sudo -u postgres psql -d catalogo -c "GRANT ALL ON SCHEMA public TO kanban;" >/dev/null

PGPASSWORD=kanban psql -h localhost -U kanban -d catalogo -v ON_ERROR_STOP=1 \
  -f .cursor/seed-catalog.sql >/dev/null

echo "start: PostgreSQL ready (cluster ${PG_VERSION}/main), catalog seeded"
