---
name: diseno-ui-ux-transnoa
description: Define un contrato visual y operativo antes de crear o rediseñar UI de Transnoa. Usar en cambios visuales nivel 2+; no usar para copy o spacing aislado.
---

# Diseño UI/UX Transnoa

## Propósito

Evitar UI genérica y pérdida funcional. La aplica el mismo `implementador_typescript` antes de editar; no crea otro writer.

## Workflow

1. Leer `docs/ai/VISUAL_GUIDELINES.md`, `docs/technical/frontend.md` y la pantalla real.
2. Leer [references/design-system-transnoa.md](references/design-system-transnoa.md) sólo para patrones afectados.
3. Inventariar acciones, estados, datos, permisos, handlers y side effects que deben preservarse.
4. Elegir una pantalla o patrón existente como referencia cuando corresponda.
5. Definir jerarquía, acción primaria, secundarias, densidad y teclado.
6. Resolver loading, vacío, error, éxito, disabled y permiso insuficiente.
7. Definir evidencia en anchos compacto, intermedio y amplio.
8. Identificar componentes y patrones Tailwind a reutilizar.
9. Marcar qué no debe cambiar.
10. Pasar a implementación sólo con un contrato verificable.

## Contrato

Usar [references/contrato-visual.md](references/contrato-visual.md) cuando la UI sea nueva o el rediseño afecte estructura o flujo.

## Reglas

- No crear un subagente diseñador ni otro writer.
- No introducir una paleta, tokens o componentes paralelos sin decisión.
- No aceptar una pantalla estética que pierda velocidad, permisos o funcionalidad.
- No usar preferencias subjetivas como criterio de aceptación.

## Cierre

El contrato identifica comportamiento preservado, jerarquía, componentes, estados, responsive, accesibilidad y evidencia.
