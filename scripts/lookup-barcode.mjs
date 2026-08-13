import pg from "pg";
import {
  filterByBarcode,
  mapCatalogItem,
} from "../src/lib/server/catalogItemMap.js";

const barcode = process.argv[2] || "4713218461926";
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(
  `
    SELECT to_jsonb(c) AS item
    FROM catalog_items c
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(c.payload->'customFields', '[]'::jsonb)) cf
      WHERE TRIM(cf->>'value') = $1
        AND (
          cf->>'name' ILIKE '%barras%'
          OR cf->>'name' ILIKE '%barcode%'
          OR cf->>'name' ILIKE '%ean%'
        )
    )
    LIMIT 8
  `,
  [barcode],
);

const mapped = filterByBarcode(
  rows.map((row) => mapCatalogItem(row.item)).filter(Boolean),
  barcode,
);

if (mapped.length === 0) {
  console.error(`No se encontró producto para ${barcode}`);
  process.exit(1);
}

for (const item of mapped) {
  console.log("nombre:", item.nombre);
  console.log("barcode:", item.barcode);
  console.log("referencia:", item.referencia);
  console.log("proveedor:", item.proveedores?.nombre ?? null);
}

await client.end();
