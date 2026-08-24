# Contrato UI: Panel por rol y acciones operativas

## Objetivo Operativo

Reducir el Panel a información cuantitativa accionable y ordenar las acciones de cada bandeja para que la tarea principal se reconozca sin leer bloques explicativos.

## Usuario Y Tarea Principal

- Jefe de Área: detectar solicitudes pendientes de firma y conocer el avance económico de su área.
- Administración: identificar ingresos, revisiones, firmas y devoluciones que requieren intervención.
- Tesorería: priorizar pagos pendientes y controlar importes pagados u observados.
- Colaborador: consultar saldo, pagos y movimientos personales.

## Referencia Canónica

- Roles y acceso: `src/lib/demo-experience.ts` y `src/lib/demo-auth.ts`.
- Estados: `src/lib/status.ts` y `src/lib/workflow-rules.ts`.
- Datos: Prisma/Postgres y las consultas existentes de cada bandeja.
- Densidad: `docs/product/dense-interface-redesign.md`.

## Funcionalidad A Preservar

- acciones: firma, asignación de lote, resolución de devoluciones, registro/edición de pago y acceso al detalle;
- Server Actions: no cambian contratos, validaciones ni side effects;
- permisos: cada KPI se calcula sólo con el alcance ya habilitado para el rol demo;
- trazabilidad: la línea de tiempo del detalle continúa visible y respaldada por versiones, auditoría, firma y pago.

## Jerarquía

- Panel: únicamente `KpiStrip`; sin hero, explicación del flujo, selector duplicado ni accesos descriptivos.
- Acción primaria: operación pendiente del rol, primero y con fondo sólido.
- Acción secundaria: `Ver detalle`, con borde neutro.
- Acción excepcional: devolución de Tesorería, al final y con tono rose.
- Detalle: contenido vigente, evidencias y timeline; sin los paneles finales redundantes de Versionado y Control.

## Componentes Y Patrones Reutilizados

- `KpiStrip`, `StatusPill`, `Modal`, `SubmitButton` y botones pill existentes.
- Grupos de acciones compactos, con altura mínima consistente y wrap sólo cuando el ancho lo exige.

## Estados

- loading/error: permanecen a cargo de App Router y las vistas existentes;
- vacío: KPIs en cero o saldo neutro sin incorporar explicaciones al Panel;
- disabled/pending/éxito: permanecen dentro de los componentes de acción y modales actuales;
- permiso insuficiente: no se modifica.

## Responsive

- compacto: KPI horizontal desplazable; botones ordenados y con wrap, sin ocupar todo el ancho por defecto;
- intermedio: acciones principales y secundarias en una misma línea cuando entren;
- amplio: franja KPI completa y grupos de acciones compactos dentro de la columna de tabla.

## Accesibilidad

- Panel conserva un encabezado sólo para lectores de pantalla y `dl` para métricas;
- botones y enlaces mantienen foco visible, texto explícito y targets cómodos;
- el tono de devolución complementa, pero no reemplaza, el texto de la acción.

## Fuera De Alcance Visual

- cambios de estados, cálculos, schema, autenticación, reportes o reglas monetarias;
- eliminación del timeline o de la evidencia de firma/pago;
- incorporación de navegación desde los KPIs.

## Evidencia Requerida

- Panel para los cuatro roles con datos reales;
- Solicitudes, Administración y Tesorería en 390, 768 y 1440 px;
- orden primario → detalle → devolución cuando corresponda;
- detalle sin los bloques finales Versionado/Control y con timeline intacto;
- consola sin errores y build aprobado.
