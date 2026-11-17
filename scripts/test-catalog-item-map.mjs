import {
  dedupeCatalogItems,
  filterByBarcode,
  filterByNombre,
  mapCatalogItem,
  normalizeCatalogPayload,
} from "../src/lib/server/catalogItemMap.js";

function assert(condition, message) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok:", message);
  }
}

const fromColumns = mapCatalogItem({
  id: 7,
  nombre: "Cable USB-C",
  codigo_barras: "7701234567890",
});
assert(fromColumns?.nombre === "Cable USB-C", "lee nombre y codigo_barras en columnas");
assert(fromColumns?.barcode === "7701234567890", "mapea codigo_barras a barcode");

const fromJson = mapCatalogItem({
  id: "abc",
  data: { name: "Memoria 128GB", barcode: "0123456789012" },
});
assert(fromJson?.nombre === "Memoria 128GB", "lee JSON anidado name/barcode");
assert(fromJson?.barcode === "0123456789012", "mapea barcode desde JSON anidado");

const fromStringJson = mapCatalogItem({
  payload: '{"nombre":"Funda","codigo_barras":"1234567890123"}',
});
assert(fromStringJson?.nombre === "Funda", "parsea JSON en texto");
assert(fromStringJson?.barcode === "1234567890123", "lee codigo_barras desde JSON texto");

const payload = {
  a: { nombre: "Mouse", codigo_barras: "7709998887776" },
  b: { name: "Teclado", barcode: "7701112223334" },
};
const items = normalizeCatalogPayload(payload);
assert(items.length === 2, "normaliza mapa JSON a lista");
assert(
  filterByBarcode(items, "7709998887776")[0]?.nombre === "Mouse",
  "filtra por codigo de barras",
);

const fromAccented = mapCatalogItem({
  "Nombre": "Pila AA",
  "Código de barras": "4713218461926",
});
assert(fromAccented?.nombre === "Pila AA", "lee nombre con clave acentuada");
assert(fromAccented?.barcode === "4713218461926", "lee codigo de barras con clave acentuada");

const fromAlegra = mapCatalogItem({
  name: "MICRO SD ADATA 32GB PREMIER CLASE 10 A1",
  preferred_supplier_name: "DIANA",
  payload: {
    name: "MICRO SD ADATA 32GB PREMIER CLASE 10 A1",
    customFields: [
      { name: "Código de barras", value: "4713218461926" },
      { name: "FAMILIA", value: "ALMACENAMIENTO" },
      { name: "PROVEEDOR", value: "DIANA" },
    ],
  },
});
assert(
  fromAlegra?.nombre === "MICRO SD ADATA 32GB PREMIER CLASE 10 A1",
  "lee name de catalog_items",
);
assert(fromAlegra?.barcode === "4713218461926", "lee Código de barras en customFields");
assert(fromAlegra?.proveedores?.nombre === "DIANA", "lee proveedor de catalog_items");

const many = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  nombre: `Cable HDMI ${i + 1}`,
  codigo_barras: `77000000000${String(i).padStart(2, "0")}`,
}));
const mappedMany = many.map((row) => mapCatalogItem(row));
assert(
  filterByNombre(mappedMany, "Cable HDMI").length === 12,
  "devuelve todos los productos que coinciden, no solo 8",
);
assert(
  filterByBarcode(mappedMany, "7700000000003")[0]?.nombre === "Cable HDMI 4",
  "filtra codigo sin recortar el catalogo",
);
assert(
  dedupeCatalogItems([mappedMany[0], mappedMany[0], mappedMany[1]]).length === 2,
  "deduplica por codigo de barras",
);

if (process.exitCode) {
  console.error("catalogItemMap tests failed");
} else {
  console.log("catalogItemMap tests passed");
}
