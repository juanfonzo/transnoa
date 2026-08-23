---
name: refinamiento-backlog
description: Refina pedidos vagos o features amplias hasta obtener alcance y criterios verificables. Usar ante ambigüedad o varias soluciones; no usar si el alcance ya está listo para implementar.
---

# Refinamiento De Backlog

## Workflow

1. Clasificar vía rápida, refinamiento liviano o completo.
2. Revisar usuario, flujo, datos, dinero, permisos, integraciones, UX y QA.
3. Separar bloqueantes, no bloqueantes y supuestos.
4. Proponer opciones con tradeoffs cuando exista más de una solución razonable.
5. Definir alcance dentro/fuera y lenguaje de dominio.
6. Redactar criterios observables y nivel de verificación.
7. Proponer vertical slices sólo si hay claridad suficiente.
8. Detenerse y preguntar si hay bloqueantes.

## Referencia

Usar [references/formato-salida.md](references/formato-salida.md) sólo cuando el refinamiento formal aporte trazabilidad.

## Reglas

- No generar backlog implementable con estado bloqueado.
- No esconder supuestos dentro de tareas técnicas.
- No sobredocumentar cambios nivel 0/1.
- Registrar una decisión durable sólo si tiene tradeoff real o costo de reversa.
