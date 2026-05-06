const memoria = {
  registroMs: [],
  movimientoMs: [],
  erroresFormulario: 0,
};

function promedio(lista) {
  if (!lista.length) return 0;
  return Math.round(lista.reduce((acc, n) => acc + n, 0) / lista.length);
}

export function iniciarMedicion(clave) {
  return { clave, inicio: Date.now() };
}

export function finalizarMedicion(marca) {
  if (!marca || !memoria[marca.clave]) return;
  memoria[marca.clave].push(Date.now() - marca.inicio);
}

export function registrarErrorFormulario() {
  memoria.erroresFormulario += 1;
}

export function obtenerResumenUx() {
  return {
    tiempoPromedioRegistroMs: promedio(memoria.registroMs),
    tiempoPromedioMovimientoMs: promedio(memoria.movimientoMs),
    tasaErrorFormulario: memoria.erroresFormulario,
  };
}
