# Contrato UI: experiencia demostrativa por rol

## Objetivo operativo

Presentar el circuito completo de viáticos con una responsabilidad clara por perfil: el Jefe de Área solicita y firma, Administración valida y corrige, Tesorería paga o devuelve y el Colaborador consulta su cuenta personal.

## Usuarios y tareas principales

- **Jefe de Área:** crear solicitudes, seguir las de su área y firmar la versión final.
- **Administración:** validar, estandarizar, asignar lote/fecha, resolver devoluciones, gestionar valores y rendiciones.
- **Tesorería:** ver solicitudes listas, registrar o actualizar pagos, solicitar correcciones y descargar reportes.
- **Colaborador:** consultar saldo, pagos y ajustes propios en modo lectura.

## Referencia canónica

- Reglas funcionales: `requerimientos.md`.
- Estados y transiciones: `src/lib/workflow-rules.ts` y Server Actions existentes.
- Sistema visual: `docs/ai/VISUAL_GUIDELINES.md`.

## Funcionalidad a preservar

- Acciones: crear y firmar solicitudes; estandarizar y versionar correcciones; registrar pagos; solicitar devoluciones; gestionar valores, retroactivos y rendiciones; exportar reportes.
- Server Actions: `createRequest`, `signRequest`, `adminStandardize`, `adminCreateCorrection`, `markPaid`, `requestCorrection` y acciones de tasas/rendiciones.
- Side effects: estados, firma vigente, pago único por versión, `CorrectionRequest`, versionado y `AuditLog`.
- La cookie `demo_role` sólo controla la experiencia demostrativa. No se presenta como autenticación ni RBAC productivo.

## Jerarquía

- Panel: sólo KPIs reales y útiles para el rol activo; sin explicación del flujo ni accesos duplicados.
- Información primaria: estado, número de solicitud/lote, fechas, importe y próxima acción.
- Acción primaria: la tarea pendiente propia del rol.
- Acciones secundarias: seguimiento, edición permitida, detalle y exportación.
- La navegación sólo muestra los módulos útiles al rol activo.

## Componentes y patrones reutilizados

- Shell amplio, franjas KPI, listas abiertas, pills, `StatusPill`, `Modal`, `SubmitButton` y tonos actuales.
- Grupos de acciones con la operación principal primero, detalle como secundario y devolución diferenciada.
- Estado de acceso insuficiente compartido para rutas fuera del perfil activo.
- Tabla abierta en ancho intermedio/amplio y registros apilados con separadores en ancho compacto.

## Estados

- Loading: límites de carga de App Router cuando se incorporen consultas lentas.
- Vacío: explica qué condición falta y cuál es el siguiente paso real.
- Error: feedback inline de Server Actions sin cerrar el modal.
- Éxito: cierre del modal, revalidación y cambio observable de estado.
- Disabled: acción visible con causa cuando el estado no permite operar.
- Permiso insuficiente: mensaje explícito y retorno al Panel; sin renderizar acciones de otro rol.

## Responsive

- Compacto: shell reducido, navegación desplazable, KPIs horizontales y registros abiertos con estado/acción visibles.
- Intermedio: tablas con desplazamiento horizontal y separadores, sin cortar columnas ni acciones.
- Amplio: KPIs en una línea y tablas abiertas con densidad operativa dentro del ancho institucional.

## Accesibilidad

- Navegación con `aria-current` y foco visible.
- Modales con semántica de diálogo, foco inicial/confinado, Escape y retorno de foco.
- Labels visibles y estados comunicados con texto además del color.

## Fuera de alcance

- Autenticación, autorización productiva o firma legal.
- Nuevo modelo de datos o integración bancaria.
- Línea de tiempo detallada de auditoría y recorrido guiado, reservados para el siguiente lote.

## Evidencia requerida

- Recorridos por los cuatro roles a 390 px, 768 px y 1440 px.
- Registro de pago y devolución desde Tesorería; corrección desde Administración.
- Acceso insuficiente por URL directa y consola sin errores.
