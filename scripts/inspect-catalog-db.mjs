import pg from "pg";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/inspect-catalog-db.mjs <DATABASE_URL>");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const targets = [
  { schema: "public", table: "catalog_items" },
  { schema: "Tables", table: "catalog_items" },
  { schema: "public", table: "items" },
  { schema: "public", table: "facturas_proveedor" },
];

for (const { schema, table } of targets) {
  const cols = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table],
  );
  console.log(`\n=== ${schema}.${table} ===`);
  if (cols.rows.length === 0) {
    console.log("  (no existe)");
    continue;
  }
  for (const r of cols.rows) {
    console.log(`  ${r.column_name}: ${r.data_type}`);
  }
  const qualified = `"${schema}"."${table}"`;
  const count = await client.query(`SELECT COUNT(*)::int AS n FROM ${qualified}`);
  console.log(`  rows: ${count.rows[0].n}`);
  const sample = await client.query(`SELECT * FROM ${qualified} LIMIT 1`);
  if (sample.rows[0])
    console.log("  sample:", JSON.stringify(sample.rows[0], null, 2));
}

await client.end();
