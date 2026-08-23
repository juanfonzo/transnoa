---
name: intake-proyecto
description: Convierte propuestas, requerimientos o notas iniciales en un brief técnico. Usar al iniciar una iniciativa amplia; no usar para mantenimiento incremental con alcance claro ni para implementar.
---

# Intake De Proyecto

## Entradas

- pedido y fuentes originales;
- `requerimientos.md` y contexto vigente;
- `docs/ai/PROJECT_CONTEXT.md`.

## Salida

Un brief técnico con hechos, supuestos, riesgos y faltantes visibles.

## Workflow

1. Separar hechos, supuestos e inferencias.
2. Identificar objetivo, usuarios, áreas, módulos, restricciones, datos e integraciones.
3. Preservar nombres, importes, fechas, métricas y compromisos recibidos.
4. Crear o actualizar `docs/product/brief.md` sólo si aporta una fuente durable.
5. Clasificar huecos como bloqueantes o no bloqueantes.
6. Derivar a `faltantes` si no pueden definirse datos, permisos, flujo o aceptación.

## Reglas

- No convertir lenguaje comercial en funcionalidades inventadas.
- No implementar código ni producir backlog ejecutable.
- No cerrar alcance con bloqueantes activos.
- No duplicar información ya canónica en `requerimientos.md`.

## Cierre

Otro agente puede entender objetivo, alcance, fuera de alcance, supuestos, riesgos y faltantes sin reinterpretar la fuente.
