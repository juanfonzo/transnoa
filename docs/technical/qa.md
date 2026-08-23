# Estrategia De QA

## Checks Disponibles

- `npm run kit:check`
- `npm run kit:test`
- `npm run check:encoding`
- `npm run typecheck`
- `npm run lint`
- `npm run test:workflow`
- `npm run test:migration:fresh` (sólo base de pruebas y con `ALLOW_MIGRATION_SMOKE_TEST=1`)
- `npm run prisma:validate`
- `npm run build`
- `npm run kit:ui-check`

## Baseline De Lint

- `prisma/seed.js` usa CommonJS de forma intencional porque el script se ejecuta con Node sin `type: module`.
- `RenditionBulkForm.tsx` y `SolicitudWizard.tsx` conservan advertencias `react-hooks/set-state-in-effect` previas al kit. La regla sólo se rebaja en esos archivos; deben refactorizarse en una tarea funcional separada.
- El baseline actual es de cinco advertencias: una variable no usada en `prisma/seed.js` y cuatro casos `set-state-in-effect` en formularios existentes. Siguen visibles y no se ocultaron.

## Regresiones Del Flujo Crítico

`npm run test:workflow` ejecuta doce casos sin dependencias nuevas sobre las reglas compartidas por las Server Actions y las fechas calendario:

- cobertura de conceptos para todos los días del período;
- lote, fecha prevista y trabajadores obligatorios antes de firma;
- estados admitidos para revisión administrativa;
- estado y firma vigente antes del primer pago;
- fecha y referencia real obligatorias para el pago;
- edición de pagos limitada a solicitudes pagadas.
- parsing UTC estricto, presentación sin desplazamiento, compatibilidad con horas heredadas y rangos inclusivos de fechas.

El comando forma parte de `npm run verify` y del workflow `Code Quality` de GitHub Actions.

El smoke test de migraciones crea un schema temporal `qa_migration_*`, aplica la historia completa mediante conexión directa, comprueba las tablas y el registro de `0_init`, y elimina ese mismo schema. No forma parte de `verify` porque requiere una base externa autorizada.

## Prioridades De Escenario

- estados válidos e inválidos de solicitud;
- corrección de lote/fecha y reinvalidación de firma;
- pago único y bloqueo posterior;
- días completos/medio viático;
- retroactivos y precisión de montos;
- rendición parcial y débito de saldo;
- filtros/exportaciones;
- autorización por rol/área cuando se implemente auth real.

Agregar tests unitarios en reglas puras y tests de integración en mutaciones críticas a medida que se creen seams estables.
