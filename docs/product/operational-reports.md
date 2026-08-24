# Reportes Operativos

## Objetivo

Dar a Administración y Tesorería una lectura rápida, filtrable y exportable de tres controles transversales: cuenta corriente, correcciones y retroactivos. La vista es estrictamente de consulta y no crea, consume ni modifica movimientos.

## Acceso

- Roles habilitados en la demo: `ADMIN` y `TESORERIA`.
- El control se aplica tanto a `/reportes` como a las nuevas exportaciones.
- `demo_role` sigue siendo una simulación comercial, no autenticación productiva.

## Navegación

La pantalla utiliza pestañas con estado en la URL:

- `saldos`: cuenta corriente vigente por colaborador;
- `correcciones`: observaciones solicitadas y estado de resolución;
- `retroactivos`: diferencias por cambio de valor diario y aplicación asociada.

Cada pestaña presenta título breve, filtros relevantes, KPIs compactos, listado abierto y descarga de la vista filtrada. Las tres exportaciones históricas de solicitudes, pagos y viáticos pagados permanecen disponibles como opción secundaria.

## Definiciones

### Saldos

- `saldo = créditos - débitos` sobre todo el ledger del colaborador.
- Un saldo positivo es `A favor`; uno negativo es `Deudor`; cero es `Sin saldo`.
- Los importes de la tabla se muestran en valor absoluto junto a su situación para evitar ambigüedad visual.
- Filtros: colaborador y situación.
- KPIs: colaboradores, saldos a favor, saldos deudores y saldo neto.

### Correcciones

- Cada fila corresponde a una `CorrectionRequest` y conserva solicitud, versión, área, lote, cuadrilla, importe, solicitante, observación y fechas.
- Filtros: colaborador, estado, área, lote y rango de fecha de solicitud.
- KPIs: total, abiertas, resueltas y anuladas.
- La acción `Ver caso` abre el detalle canónico de la solicitud.

### Retroactivos

- Cada fila corresponde a un `RetroactiveAdjustmentItem` y muestra período, vigencia, valor anterior/nuevo, colaborador, días, diferencia y aplicación.
- Filtros: colaborador, período, estado y rango de vigencia.
- KPIs: ajustes, diferencia total y días recalculados.
- Cuando existe pago asociado, la fila enlaza la solicitud donde se aplicó.

## Paginación Y Exportación

- La UI pagina en servidor de a 8 filas con orden determinista.
- Los filtros se guardan en query params y se preservan al avanzar o retroceder.
- Una página solicitada fuera del rango se normaliza a la última página disponible.
- `Exportar vista` descarga todos los registros que cumplen los filtros activos, no sólo la página visible.
- Los archivos `.xls` conservan valores numéricos y referencias de solicitud/pago para conciliación.

## Estados Vacíos

- Sin datos globales: se informa que todavía no existe información para el reporte.
- Sin coincidencias: se informa que los filtros no devolvieron resultados y se ofrece limpiarlos.

## Criterios De Aceptación

- Administración y Tesorería pueden abrir las tres pestañas y exportarlas.
- Otros roles reciben el aviso de acceso insuficiente también en los route handlers.
- KPIs, filas y exportación responden al mismo conjunto de filtros.
- Desktop muestra tabla; móvil muestra fichas abiertas sin scroll horizontal obligatorio.
- Ninguna consulta altera saldos, correcciones, retroactivos, pagos ni auditoría.
