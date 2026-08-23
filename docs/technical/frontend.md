# Frontend

## Patrones

- Layout raíz institucional en `src/app/layout.tsx`.
- Navegación compartida en `AppNav`.
- Modales controlados para acciones cortas.
- Formularios complejos como Client Components; persistencia con Server Actions.
- Feedback pendiente mediante `SubmitButton` y acciones con `useActionState` cuando se necesita resultado estructurado.
- Estados con `StatusPill` y helpers de `src/lib/status.ts`.

## Reglas

- Reutilizar composición, tonos, espaciado y componentes actuales.
- Copy en español; no degradar acentos.
- Formularios: labels, validación útil, pending, éxito/error y prevención de doble envío.
- Tablas: encabezados, scroll responsive, vacío y filtros server-side cuando crezcan.
- No crear acciones decorativas ni seguridad sólo visual.
- UI nivel 2+ requiere contrato `diseno-ui-ux-transnoa` y navegador.

La referencia operativa detallada vive en `.agents/skills/diseno-ui-ux-transnoa/references/design-system-transnoa.md`.
