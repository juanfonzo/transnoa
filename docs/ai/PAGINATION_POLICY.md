# Política De Paginación

## Cuándo

Paginar cuando el conjunto pueda crecer sin límite práctico: solicitudes, auditoría, pagos, movimientos, rendiciones o reportes.

## Reglas

- Filtrar y ordenar server-side antes de paginar.
- Usar orden estable con desempate único.
- Mantener filtros en query params.
- No traer todo para paginar en cliente.
- Definir tamaño y límite máximo razonables.
- Mostrar vacío global diferente de cero resultados por filtros.
- Preservar accesibilidad y foco al navegar.

Cursor es preferible para feeds grandes/mutables; offset es aceptable en tablas administrativas moderadas con orden estable.
