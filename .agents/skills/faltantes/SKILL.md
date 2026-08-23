---
name: faltantes
description: Detecta preguntas bloqueantes, no bloqueantes, supuestos y riesgos. Usar cuando falta información crítica; no usar para diseñar la solución ni implementar.
---

# Faltantes

## Workflow

1. Leer la fuente original y decisiones relacionadas.
2. Clasificar cada hueco como bloqueante o no bloqueante.
3. Proponer supuestos sólo cuando no comprometan dinero, datos, permisos, seguridad, integraciones o alcance contractual.
4. Registrar faltantes en chat o `docs/intake/faltantes.md` si necesitan continuidad.
5. Detener el flujo cuando existan bloqueantes activos.
6. Incorporar respuestas con fuente y artefactos actualizados.

## Formato

```md
# Faltantes

Estado: pendiente / bloqueado / resuelto / sin-bloqueantes

## Bloqueantes Activos
- Pregunta:
  Motivo:
  Impacto:

## No Bloqueantes
- Pregunta:
  Supuesto provisional:
  Riesgo:
```

## Regla De Bloqueo

No implementar si falta definir datos, permisos, dinero, flujo principal, integración o criterio de aceptación, salvo autorización explícita para un supuesto documentado.
