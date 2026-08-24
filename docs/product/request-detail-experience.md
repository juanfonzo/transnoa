# Contrato UI: detalle y trazabilidad de solicitud

## Objetivo Operativo

Convertir cada solicitud en una historia verificable del circuito completo: creación, revisión, versiones, firma, pago, correcciones y rendiciones.

## Usuario Y Tarea Principal

- Jefe de Área: revisar el documento actual, entender qué cambió y firmar cuando corresponda.
- Administración: validar contenido, resolver observaciones y comprobar la versión vigente.
- Tesorería: confirmar firma, lote e importe antes de pagar o devolver.
- Colaborador: consultar únicamente su asignación y la evidencia de pago asociada.

## Referencia Canónica

La jerarquía y los componentes reutilizan las bandejas de Solicitudes, Administración y Tesorería, junto con `StatusPill`, `SolicitudActions`, `AdminActions` y `TreasuryActions`.

## Funcionalidad A Preservar

- acciones: firma, estandarización, nueva versión, pago y solicitud de corrección;
- Server Actions: `signRequest`, `adminStandardize`, `adminCreateCorrection`, `markPaid` y `requestCorrection`;
- permisos: Jefatura sólo ve su área; Colaborador sólo solicitudes que incluyen el legajo demo; Administración y Tesorería pueden consultar todas;
- side effects: cambios de estado, versión, firma, pago, correcciones y `AuditLog` permanecen en sus acciones existentes.

## Jerarquía

- información primaria: número, estado, área, período, versión vigente, lote, fecha prevista e importe visible para el rol;
- acción primaria: la acción pendiente del rol activo;
- acciones secundarias: volver a la bandeja correspondiente y consultar contenido/evidencias;
- trazabilidad: línea de tiempo cronológica como única síntesis de versiones y control, sin paneles redundantes ni JSON técnico de auditoría.

## Componentes Y Patrones Reutilizados

- shell `max-w-7xl`, franja KPI y secciones abiertas separadas por ritmo y bordes slate;
- `StatusPill`, pills de metadatos, tablas abiertas con alternativa móvil y acciones actuales;
- enlaces reales para abrir el detalle desde cada bandeja.

## Estados

- loading: skeleton de cabecera, resumen y contenido;
- vacío: mensajes específicos para ausencia de firma, pago, correcciones, conceptos o rendiciones;
- error/no encontrado: vista local con retorno a la bandeja;
- éxito: feedback existente de cada Server Action y revalidación del detalle;
- disabled: `SubmitButton` evita doble envío;
- permiso insuficiente: `RoleAccessNotice` sin renderizar información de la solicitud.

## Responsive

- compacto: franja KPI desplazable, colaboradores separados por filas, agenda y timeline en una columna;
- intermedio: métricas horizontales y secciones de evidencia en paralelo;
- amplio: contenido principal más timeline lateral persistente en el flujo de lectura.

## Accesibilidad

- navegación por enlaces y botones nativos con foco visible;
- timeline como lista ordenada y metadatos con `dl`;
- estado expresado con texto además de color;
- tablas con encabezados y alternativa compacta sin perder importe ni acción.

## Fuera De Alcance Visual

- autenticación productiva, firma legal, descarga de documentos y carga real de adjuntos;
- modificación del schema o de las reglas monetarias;
- exposición de DNI, CBU o JSON crudo de auditoría.

## Evidencia Requerida

- Jefatura con solicitud pendiente de firma;
- Tesorería con solicitud lista para pagar y solicitud pagada;
- Administración con devolución abierta;
- Colaborador con una solicitud propia y bloqueo de una ajena;
- anchos 390, 768 y 1440 px; consola sin errores.
