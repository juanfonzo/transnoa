# Estrategia De QA

## Checks Disponibles

- `npm run kit:check`
- `npm run kit:test`
- `npm run check:encoding`
- `npm run typecheck`
- `npm run lint`
- `npm run prisma:validate`
- `npm run build`
- `npm run kit:ui-check`

## Baseline De Lint

- `prisma/seed.js` usa CommonJS de forma intencional porque el script se ejecuta con Node sin `type: module`.
- `RenditionBulkForm.tsx` y `SolicitudWizard.tsx` conservan advertencias `react-hooks/set-state-in-effect` previas al kit. La regla sólo se rebaja en esos archivos; deben refactorizarse en una tarea funcional separada.
- Las advertencias de variables no usadas siguen visibles y no se ocultaron.

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
