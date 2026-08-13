import {
  aplicarConfirmacionCatalogo,
  debeBuscarMientrasEscribe,
  pareceCodigoBarras,
} from "../src/lib/pareceCodigoBarras.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(pareceCodigoBarras("4713218461926"), "EAN debe detectarse como código");
assert(!pareceCodigoBarras("MICRO SD ADATA 32GB"), "el nombre no es código");

assert(
  debeBuscarMientrasEscribe("4713218461926") === false,
  "no buscar en cada tecla si es código de barras",
);
assert(debeBuscarMientrasEscribe("MICRO") === true, "sí buscar nombres desde 2 caracteres");
assert(debeBuscarMientrasEscribe("M") === false, "no buscar con 1 carácter");

const ok = aplicarConfirmacionCatalogo({
  nombre: "MICRO SD ADATA 32GB PREMIER CLASE 10 A1",
  proveedor_id: 3,
});
assert(ok.ok === true, "confirmación válida");
assert(ok.enviarFaltante === false, "Sí no debe enviar el faltante");
assert(
  ok.productoNombre === "MICRO SD ADATA 32GB PREMIER CLASE 10 A1",
  "Sí debe poner el nombre en el campo",
);
assert(ok.proveedorId === 3, "puede rellenar proveedor del catálogo");

const fail = aplicarConfirmacionCatalogo({ nombre: "4713218461926" });
assert(fail.ok === false, "no confirmar un código como nombre");

console.log("ok: flujo código de barras (consultar → preguntar → rellenar nombre)");
