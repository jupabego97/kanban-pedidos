import { Pool } from "pg";
import { env } from "$env/dynamic/private";

let pool;
let schemaReady = false;

function getConnectionString() {
  return env.DATABASE_PUBLIC_URL || env.DATABASE_URL;
}

export function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error(
        "Falta DATABASE_PUBLIC_URL o DATABASE_URL en el entorno.",
      );
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : {
            rejectUnauthorized: false,
          },
    });
  }
  return pool;
}

async function ensureSchema() {
  if (schemaReady) return;

  await queryRaw(`
    CREATE TABLE IF NOT EXISTS proveedores (
      id BIGSERIAL PRIMARY KEY,
      alegra_id TEXT,
      nombre TEXT NOT NULL UNIQUE,
      dias_entrega INTEGER,
      actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRaw(`
    CREATE TABLE IF NOT EXISTS productos_catalogo (
      id BIGSERIAL PRIMARY KEY,
      alegra_id TEXT,
      nombre TEXT NOT NULL,
      proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
      proveedor_alegra_id TEXT,
      actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRaw(`
    ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS alegra_id TEXT;
  `);

  await queryRaw(`
    ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await queryRaw(`
    ALTER TABLE productos_catalogo
    ADD COLUMN IF NOT EXISTS alegra_id TEXT;
  `);

  await queryRaw(`
    ALTER TABLE productos_catalogo
    ADD COLUMN IF NOT EXISTS proveedor_alegra_id TEXT;
  `);

  await queryRaw(`
    ALTER TABLE productos_catalogo
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await queryRaw(`
    CREATE TABLE IF NOT EXISTS solicitudes (
      id BIGSERIAL PRIMARY KEY,
      producto_nombre TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'Agotado',
      proveedor_id BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
      contacto_cliente TEXT,
      cantidad_pedida INTEGER NOT NULL DEFAULT 1,
      estado TEXT NOT NULL DEFAULT 'solicitudes',
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await queryRaw(`
    CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
  `);

  await queryRaw(`
    CREATE INDEX IF NOT EXISTS idx_solicitudes_creado_en ON solicitudes(creado_en DESC);
  `);

  await queryRaw(`
    DROP INDEX IF EXISTS ux_proveedores_alegra_id;
  `);

  await queryRaw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_alegra_id
    ON proveedores(alegra_id);
  `);

  await queryRaw(`
    DROP INDEX IF EXISTS ux_productos_catalogo_alegra_id;
  `);

  await queryRaw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_catalogo_alegra_id
    ON productos_catalogo(alegra_id);
  `);

  schemaReady = true;
}

async function queryRaw(text, values = []) {
  return getPool().query(text, values);
}

export async function query(text, values = []) {
  await ensureSchema();
  return queryRaw(text, values);
}
