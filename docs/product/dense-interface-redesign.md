# Contrato UI: interfaz operativa compacta

## Objetivo Operativo

Aumentar la densidad útil de la demo para que métricas, pendientes y acciones entren antes en pantalla, sin perder comprensión, responsive ni jerarquía por rol.

## Usuario Y Tarea Principal

- Jefe de Área: detectar solicitudes pendientes y actuar sin recorrer bloques decorativos.
- Administración: comparar colas y operar solicitudes, saldos, retroactivos y rendiciones con menos desplazamiento.
- Tesorería: priorizar pagos y devoluciones por monto, estado y fecha.
- Colaborador: leer saldo, pagos y movimientos como una cuenta personal compacta.

## Referencia Canónica

- Funcionalidad y permisos: `docs/product/demo-experience.md`.
- Detalle y trazabilidad: `docs/product/request-detail-experience.md`.
- Sistema visual: `docs/ai/VISUAL_GUIDELINES.md`.

## Funcionalidad A Preservar

- acciones: creación, estandarización, corrección, firma, pago, rendición, retroactivos, alta de colaborador y exportaciones;
- Server Actions/rutas: no se modifican contratos ni side effects;
- permisos: se conserva la visibilidad y el acceso por rol demo;
- navegación: tabs, enlaces a detalle, reportes y retorno por rol;
- estados: loading, vacío, error, éxito, disabled y acceso insuficiente.

## Jerarquía

- información primaria: número/lote, estado, fecha, monto y próxima acción;
- KPIs: etiqueta breve, valor y un único dato complementario cuando aporte decisión;
- acción primaria: mantiene mayor contraste; las secundarias conservan borde y foco;
- listas: filas abiertas sobre el lienzo, encabezado y separadores; sin card contenedora;
- detalles: títulos y evidencia se separan por ritmo, borde superior y columnas, no por card repetida.

## Componentes Y Patrones Reutilizados

- Nuevo `KpiStrip` compartido para métricas sin cards, horizontal en compacto y distribuido en amplio.
- `StatusPill`, `Modal`, `SubmitButton`, navegación y tonos semánticos existentes.
- Tablas con `border-y`, encabezado tenue y filas divididas.
- Listas compactas con `divide-y`; sin bordes, radios o sombras por registro.

## Estados

- loading: skeletons lineales que anticipan franja KPI y secciones abiertas;
- vacío: bloque delimitado y breve porque comunica una excepción, no una lista;
- error y permiso insuficiente: conservan contención para destacarse del contenido normal;
- éxito/disabled: se mantienen en los componentes de acción existentes.

## Responsive

- compacto: KPIs en una sola franja desplazable; registros apilados con separadores y acciones visibles;
- intermedio: tablas con desplazamiento horizontal y sin wrapper tipo card;
- amplio: KPIs en una línea; la bandeja comienza dentro del primer viewport y el shell operativo se amplía a `max-w-7xl`.

## Accesibilidad

- teclado/foco: enlaces, tabs, details y botones mantienen foco visible y targets mínimos;
- contraste/labels: métricas usan texto y punto semántico, nunca sólo color;
- semántica: KPIs conservan `dl`; listados mantienen `table`, encabezados y secciones rotuladas.

## Excepciones De Contención

Se conservan superficies cerradas únicamente para modales/formularios, avisos de acceso, estados vacíos o de error, y paneles de acción sensible que necesitan una frontera operativa.

## Fuera De Alcance Visual

- reglas económicas, schema, datos, permisos productivos y flujos de negocio;
- paginación, filtros nuevos, recorrido guiado, PDF y adjuntos reales;
- cambio de paleta, tipografía o navegación institucional.

## Evidencia Requerida

- Panel, Solicitudes, Administración, Colaboradores, Tesorería, Reportes y detalle de solicitud;
- roles Jefe de Área, Administración, Tesorería y Colaborador;
- anchos 390, 768 y 1440 px;
- bandejas sin card exterior, KPIs sin sombra y acciones sin cortes;
- consola sin errores y flujos existentes preservados.
