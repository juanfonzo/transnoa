---
name: cambio-cliente
description: Clasifica una solicitud incremental y decide vía rápida, refinamiento, diseño o backlog. Usar antes de planificar mantenimiento; no usar si el pedido ya es implementable.
---

# Cambio De Cliente

## Workflow

1. Leer el pedido original y el estado vigente.
2. Clasificar vía rápida, refinamiento liviano o completo.
3. Evaluar impacto en producto, datos, Server Actions, UI, permisos, integraciones y QA.
4. Detectar contradicciones con reglas de viáticos o decisiones vigentes.
5. Generar faltantes cuando una decisión crítica no pueda inferirse.
6. Usar `refinamiento-backlog` si el pedido es macro, ambiguo o admite varias soluciones.
7. Actualizar sólo los artefactos canónicos afectados.
8. Si existe un archivo formal en `docs/changes/pending/`, moverlo a `processed/` o `rejected/` al cerrarlo.

## Reglas

- No reescribir requerimientos o arquitectura global por un cambio localizado.
- No crear un archivo para un pedido de chat si no aporta trazabilidad.
- No convertir ambigüedad en tareas técnicas.
- Mantener identificable el pedido original.

## Cierre

El pedido queda resuelto por vía rápida, listo para refinamiento/backlog, bloqueado o rechazado con impacto y próximo paso claros.
