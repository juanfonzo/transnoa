---
name: verificacion
description: Verifica código o entregables contra criterios y riesgos. Usar para QA, revisión visual, aceptación o handoff; no usar para implementar durante una revisión independiente.
---

# Verificación

## Workflow

1. Clasificar nivel 0–4.
2. Leer criterios, contrato, fuera de alcance y policies aplicables.
3. Revisar diff, ownership y archivos afectados.
4. Ejecutar checks de cada superficie afectada.
5. Validar comportamiento observable, fuentes de autoridad y casos negativos.
6. Para UI, verificar sistema visual, funcionalidad preservada, responsive, teclado, foco y estados.
7. Revisar autorización, datos sensibles, dinero, integraciones, performance y observabilidad.
8. Confirmar que no queden agentes, tests o procesos activos.
9. Reportar hallazgos con severidad y evidencia exacta.

## Reglas

- `qa_seguridad` trabaja read-only.
- Una preferencia subjetiva no es hallazgo; una pérdida funcional, de accesibilidad o seguridad sí.
- No aceptar sólo revisión estática para un flujo crítico si el entorno permite validarlo.
- Los fixes los aplica el hilo principal o el owner de escritura en una fase separada.

## Cierre

Existe evidencia proporcional para cada superficie y riesgo; el contrato se respetó y los riesgos residuales son explícitos.
