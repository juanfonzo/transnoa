# Guía Visual De Transnoa

## Base Actual

- Shell centrado de hasta `max-w-6xl` con gutters consistentes.
- Fondo slate/blanco con acentos amber, emerald y sky.
- Superficies blancas, bordes slate suaves, sombras discretas y radios amplios.
- Pills para navegación, estados y metadatos.
- Jerarquía tipográfica con Geist y copy en español.

## Reutilización

- Usar componentes compartidos antes de crear variantes.
- Mantener `StatusPill` como fuente visual de estados.
- Mantener `SubmitButton` para pending/disabled.
- Mantener `Modal` para formularios cortos y confirmaciones.
- No introducir hex, colores Tailwind arbitrarios ni estilos inline fuera de una necesidad justificada.

## Operación

- Mostrar primero número de solicitud/lote, estado, fechas y monto relevante.
- Acciones sensibles deben explicar consecuencia y pedir confirmación cuando corresponda.
- Dinero se formatea en ARS y fechas según las helpers existentes.
- Estados vacíos deben explicar qué falta y ofrecer una acción sólo si es real.

## Responsive Y Accesibilidad

- Las tablas anchas requieren scroll horizontal o una composición móvil equivalente.
- Mantener `min-w-0`, truncado consciente y targets cómodos.
- No ocultar acciones esenciales sólo por breakpoint.
- Mantener labels, foco visible, teclado y contraste.
- No usar sólo color para estado.
