---
name: evolucion-prisma-postgres
description: Ejecuta cambios seguros de schema, datos, backfills e índices con Prisma/Postgres. Usar con contrato de datos aprobado; no usar para explorar modelos vagos ni aceptar pérdida global de datos.
---

# Evolución Prisma/Postgres

## Workflow

1. Inspeccionar schema, queries, constraints, índices y datos afectados.
2. Clasificar el cambio como aditivo, compatible, breaking o destructivo.
3. Diseñar precheck y estimar impacto de lock/tiempo.
4. Separar expansión, backfill y contracción cuando sea necesario.
5. Hacer backfills idempotentes, paginados y retomables.
6. Mantener código viejo/nuevo compatible durante el despliegue.
7. Definir rollback o forward-fix.
8. Probar nulos, duplicados, precisión Decimal, reejecución y fallo parcial.
9. Actualizar consumidores, seed, tests y documentación.

## Reglas

- No usar `db push --accept-data-loss` como solución general.
- No ejecutar `prisma db push`, seeds o scripts contra una base real sin identificar el destino y confirmar autorización.
- No confiar sólo en validación de UI para invariantes críticas.
- No crear índices o constraints costosos sin evaluar producción.
- No mezclar un refactor de dominio no solicitado.

## Cierre

El cambio tiene precheck, secuencia, compatibilidad, validación y rollback/forward-fix; el entorno aplicado queda identificado sin exponer credenciales.
