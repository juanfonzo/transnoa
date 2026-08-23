---
name: arquitectura-contratos
description: Define módulos, límites, contratos, datos e integraciones. Usar cuando una feature necesita diseño técnico antes de implementar; no usar para resolver reglas de negocio faltantes ni escribir código.
---

# Arquitectura Y Contratos

## Workflow

1. Leer requerimientos y código real proporcional al riesgo.
2. Definir límites de módulos y responsabilidades.
3. Diseñar contratos de datos, Server Actions, rutas, permisos e integraciones.
4. Especificar inputs, outputs, errores, casos negativos e invariantes.
5. Clasificar variables y servicios de entorno como bloqueantes o con fallback.
6. Identificar riesgos, tradeoffs, reversibilidad, observabilidad y migración/rollback.
7. Actualizar sólo documentos técnicos afectados.
8. Registrar decisiones no obvias en `docs/ai/DECISIONS.md`.

## Reglas

- Preferir módulos profundos con interfaces simples.
- Evitar arquitectura especulativa y abstracciones sin consumidor.
- Diseñar para testabilidad y evolución.
- No cerrar contratos con bloqueantes de negocio.

## Cierre

Otro agente puede implementar sin inventar campos, permisos, errores, estados ni dependencias.
