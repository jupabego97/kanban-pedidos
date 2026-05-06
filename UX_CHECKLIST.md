# UX Checklist de Aceptacion

## Metricas objetivo

- Tiempo promedio de registro: menor a 8 segundos.
- Tiempo promedio de mover tarjeta de columna: menor a 3 segundos.
- Errores de formulario por sesion: tender a 0.

Nota: el resumen en memoria se puede inspeccionar en consola importando `obtenerResumenUx()` desde `src/lib/uxMetrics.js`.

## Flujo Mostrador

- [ ] El campo producto muestra estados de busqueda y sin resultados.
- [ ] Se puede navegar sugerencias con teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- [ ] No hay doble envio cuando el boton esta en estado de envio.
- [ ] Al guardar exitoso se limpia formulario y vuelve el foco al producto.
- [ ] Se muestra notificacion de exito o error.

## Flujo Kanban

- [ ] El filtro por proveedor se mantiene al cambiar de vista o recargar.
- [ ] Al arrastrar, la columna destino se resalta visualmente.
- [ ] Al soltar tarjetas, se muestra confirmacion no intrusiva.
- [ ] Si falla el guardado de estado, aparece mensaje de error.

## Tarjetas

- [ ] La cantidad valida muestra errores inline cuando es invalida.
- [ ] Eliminar requiere doble accion (evita borrados accidentales).
- [ ] Fecha y contacto se leen con claridad en movil.

## Estados globales

- [ ] Si falla carga inicial, se muestra banner con boton de reintento.
- [ ] Vista Kanban vacia muestra estado de lista vacia.
- [ ] Notificaciones globales desaparecen automaticamente.

## Accesibilidad y mobile

- [ ] Elementos interactivos tienen foco visible.
- [ ] Inputs y botones tienen alto tactil adecuado.
- [ ] La interfaz sigue usable con `prefers-reduced-motion`.
