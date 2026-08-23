---
name: prd-tecnico
description: Genera o refina un PRD técnico desde un brief y faltantes resueltos. Usar para definición funcional antes de arquitectura o backlog; no usar para diseñar la implementación.
---

# PRD Técnico

## Workflow

1. Separar problema, solución, usuarios, roles y objetivos.
2. Definir capacidades, historias, requisitos, reglas y criterios.
3. Asignar IDs estables cuando el documento sea grande: `US-*`, `FR-*`, `NFR-*`, `BR-*`, `AC-*`.
4. Vincular objetivos con métricas reales o `_TBD_`; no inventar números.
5. Definir fuera de alcance y decisiones pendientes.
6. Verificar que cada requisito crítico tenga criterio de aceptación.
7. Crear o actualizar `docs/product/prd.md` sólo si es el punto de verdad adecuado.

## Reglas

- Usar lenguaje del dominio de viáticos.
- No introducir rutas o detalles de implementación salvo decisión aceptada.
- Volver a `faltantes` si una inconsistencia es bloqueante.

## Cierre

Arquitectura y backlog pueden consumir el PRD sin reinterpretar el negocio.
