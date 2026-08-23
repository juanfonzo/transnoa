# Sistema Visual Y Patrones Operativos De Transnoa

## Shell Y Lenguaje Visual

- Mantener el ancho central `max-w-6xl`, gutters responsivos y fondo claro con gradiente sutil.
- Usar slate como base; amber, emerald y sky como tonos semánticos ya presentes.
- Cards principales: fondo blanco, borde slate suave, sombra discreta y radios `rounded-2xl`/`rounded-3xl`.
- Mantener encabezado institucional, etiqueta POC y navegación con pills mientras la experiencia siga siendo demo.
- Usar español claro con acentos correctos y vocabulario de viáticos.

## Componentes

- Reutilizar `Modal`, `SubmitButton`, `StatusPill`, `FlowCard` y patrones existentes antes de crear variantes.
- Una acción visible necesita Server Action, route handler o navegación real.
- Deshabilitar acciones mientras se envían y dar feedback de éxito/error.
- Confirmar acciones destructivas o irreversibles.

## Formularios Y Flujos

- Mantener etiquetas visibles, ayuda inline y errores junto al campo.
- Evitar card-in-card innecesario; agrupar por tarea y dependencia.
- Cálculos de días, montos y saldos deben tener una única fuente de verdad.
- Los modales son apropiados para formularios cortos y confirmaciones; usar página o sección para contenido denso.

## Tablas Y Responsive

- Encabezados claros, alineación consistente de dinero/estado y filas explorables.
- En tablas anchas, usar `overflow-x-auto` o una alternativa móvil verificable; no cortar acciones.
- Filtros deben conservarse en query params cuando la página ya usa ese patrón.
- Diseñar para ancho compacto, intermedio y amplio sin detectar zoom/DPR.

## Estados Y Accesibilidad

- Cubrir loading, vacío, error, éxito, disabled y permiso insuficiente cuando apliquen.
- Mantener foco visible, labels asociados, controles por teclado y contraste suficiente.
- No depender sólo del color para comunicar estado.

## POC Versus Producción

- No ocultar que el selector de rol es demo.
- No presentar firma PIN demo o cambio de cookie como seguridad productiva.
- Al incorporar autenticación real, reemplazar progresivamente el affordance demo y sus copys.
