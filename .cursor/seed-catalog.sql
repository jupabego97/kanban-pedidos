-- Catalog database schema + sample data for local development.
-- Mirrors the columns the app reads in src/lib/server/catalogSources.js:
--   items(id, nombre, codigo_barras, familia)
--   facturas_proveedor(proveedor)
-- Inserts run only when a table is empty, so this script is idempotent.

CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo_barras TEXT,
  familia TEXT
);

CREATE TABLE IF NOT EXISTS facturas_proveedor (
  id BIGSERIAL PRIMARY KEY,
  proveedor TEXT
);

INSERT INTO items (nombre, codigo_barras, familia)
SELECT * FROM (VALUES
  ('Cable HDMI 2.0 1.5m', '7501234567890', 'Cables'),
  ('Memoria USB 32GB', '7501234567891', 'Almacenamiento'),
  ('Cargador USB-C 20W', '7501234567892', 'Cargadores'),
  ('Audifonos Bluetooth', '7501234567893', 'Audio'),
  ('Mouse inalambrico', '7501234567894', 'Perifericos'),
  ('Teclado mecanico', '7501234567895', 'Perifericos'),
  ('Bateria AA (paquete 4)', '7501234567896', 'Pilas'),
  ('Adaptador HDMI a VGA', '7501234567897', 'Adaptadores')
) AS v(nombre, codigo_barras, familia)
WHERE NOT EXISTS (SELECT 1 FROM items);

INSERT INTO facturas_proveedor (proveedor)
SELECT * FROM (VALUES
  ('Distribuidora Electronica SA'),
  ('Importaciones Tech'),
  ('Mayorista Digital'),
  ('Distribuidora Electronica SA'),
  ('Componentes del Norte')
) AS v(proveedor)
WHERE NOT EXISTS (SELECT 1 FROM facturas_proveedor);
