# Política De Contexto De Código

Toda implementación comienza leyendo código real proporcional al riesgo.

## Nivel A — Microcambio

Leer archivo afectado y patrón cercano.

## Nivel B — Función O Componente

Leer función/componente, callers/imports, tipos y tests relacionados.

## Nivel C — Feature O Flujo

Leer pedido, UI, Server Action/route handler, librerías, schema, validaciones y escenarios.

## Nivel D — Crítico

Para permisos, PII, saldos, pagos, firma, migraciones o producción, leer el flujo completo UI → servidor → DB/integración, casos negativos, entorno, rollback y auditoría.

## Reglas

- No editar por intuición ni introducir contratos sin revisar productores/consumidores.
- No cambiar permisos sólo en UI.
- No cambiar DB sin revisar schema, seed, consumidores y datos existentes.
- No cambiar UI sin revisar estados y acciones preservadas.
- `rg`/`rg --files` son la primera opción de búsqueda.
- CodeGraph puede orientar en cambios grandes, pero no reemplaza archivos reales.
