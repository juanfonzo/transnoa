---
name: diagnostico
description: Diagnostica bugs, regresiones y lentitud mediante un loop reproducible. Usar cuando algo falla o un test se rompe; no usar para implementar una feature nueva con alcance claro.
---

# Diagnóstico

## Workflow

1. Construir el loop reproducible más pequeño.
2. Confirmar la reproducción antes de editar, salvo incidente crítico.
3. Mapear el flujo real y sus fuentes de estado.
4. Formular de tres a cinco hipótesis falsables ordenadas.
5. Definir evidencia que confirma o descarta cada hipótesis.
6. Probar una variable por vez.
7. Aplicar el cambio mínimo que corrige la causa.
8. Agregar regresión cuando exista un seam estable.
9. Reejecutar el loop original y limpiar instrumentación.

## Reglas

- No arreglar por intuición un problema no trivial.
- Para performance, medir baseline y resultado.
- Usar `[DEBUG-diagnostico]` sólo para instrumentación temporal y eliminarla.
- No ampliar el alcance a refactors innecesarios.

## Cierre

La causa está demostrada; el loop pasa o el bloqueo queda probado; no quedan logs ni procesos temporales.
