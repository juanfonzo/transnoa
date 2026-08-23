---
name: refinamiento-kit
description: Mejora exclusivamente el kit Dev IA a partir de evidencia y repetición. Usar para auditar políticas, routing, skills o validadores; no usar para cambiar el producto.
---

# Refinamiento Del Kit

## Workflow

1. Agrupar señales por fingerprint.
2. Contrastar evidencia, repetición, severidad y cobertura existente.
3. Decidir: descartar, observar, pedir evidencia, fusionar, promover o backlog interno.
4. Modificar una única fuente canónica y enlazar desde el resto.
5. Registrar una lección sólo si cambia comportamiento futuro.
6. Archivar señales cerradas y mantener el inbox corto.
7. Antes de eliminar una regla, mapear su destino.
8. Ejecutar `npm run kit:check` y `npm run kit:test`.

## Reglas

- No inflar prompts por una preferencia puntual.
- No duplicar una regla entre `AGENTS.md`, skill, policy y agente.
- No tocar producto, base o datos como efecto colateral.
- Toda eliminación debe preservar conocimiento específico de Transnoa.

## Cierre

Cada señal queda decidida con evidencia y los validadores pasan sin crear otro punto de verdad.
