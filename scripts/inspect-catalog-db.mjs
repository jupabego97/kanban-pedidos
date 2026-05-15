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

for (const table of ["items", "facturas_proveedor"]) {
  const cols = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  console.log(`\n=== ${table} ===`);
  for (const r of cols.rows) {
    console.log(`  ${r.column_name}: ${r.data_type}`);
  }
  const count = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  console.log(`  rows: ${count.rows[0].n}`);
  const sample = await client.query(`SELECT * FROM ${table} LIMIT 1`);
  if (sample.rows[0])
    console.log("  sample:", JSON.stringify(sample.rows[0], null, 2));
}

await client.end();
