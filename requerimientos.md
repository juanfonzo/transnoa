# Guía de requerimientos para IA generativa de código

## Sistema de Viáticos (TRANSNOA S.A.) — Next.js + Tailwind

> **Objetivo**: construir un sistema web para **solicitud, aprobación, trazabilidad y control** de viáticos (adelantos) para cuadrillas. Incluye **cuenta corriente** por trabajador, **ajustes retroactivos** cuando cambia el monto del viático dentro de un mes, y **firma digital interna** (no certificada legalmente).
> **Alcance inicial**: Provincia / Operación Santiago del Estero (expandible).

---

## 0) Stack y lineamientos técnicos (obligatorio)

* **Frontend/Backend**: Next.js (App Router) + TypeScript + Tailwind.
* **DB**: Postgres (recomendado).
* **ORM**: Prisma (recomendado).
* **Validación**: Zod (recomendado).
* **Auth**: NextAuth o auth propio con sesiones (recomendado NextAuth).
* **Roles/RBAC**: obligatorio.
* **Auditoría**: obligatorio (tabla de logs).
* **Exportaciones**: PDF y Excel/CSV (mínimo: CSV; PDF opcional si se complica).
* **Arquitectura**: server actions o route handlers; evitar lógica en cliente.
* **No legal signature provider**: firma interna con registro y evidencia.

---

## 1) Roles y permisos (RBAC)

### Roles

1. **Jefe de Área**

* Crear solicitud de viáticos (borrador).
* Enviar a Administración.
* Revisar solicitud estandarizada.
* **Firmar digitalmente** la versión final (firma formal interna).
* Ver estado, histórico y exportar.

2. **Administración**

* Ver solicitudes entrantes.
* Validar campos obligatorios.
* **Estandarizar** solicitud (formato final).
* Asignar **Número de Lote**.
* Definir/editar **Fecha prevista de pago**.
* Gestionar **correcciones/versionado** (incluye cambio de lote y reprogramación de fecha).
* Generar lotes de **ajuste retroactivo** por cambio de monto.
* Reportes y exportaciones.

3. **Tesorería**

* Ver solicitudes firmadas y completas.
* Registrar **pago/depósito** (fecha, referencia, comprobante opcional).
* Si requiere cambios (banco no hábil, etc.): **devolver a Administración** para cambio de lote/fecha.
* Reportes y exportaciones.

4. **Trabajador**

* Solo lectura (según política): ver historial de pagos y saldo de cuenta corriente.
* No confirma recepción (por ahora).

### Reglas clave

* **Cambio de lote y/o fecha de pago**: lo realiza **solo Administración**.
* Tesorería nunca edita lote/fecha: solo **solicita corrección** y queda trazado.

---

## 2) Conceptos del dominio (definiciones)

* **Solicitud de viáticos**: adelanto por N días para una cuadrilla y uno o más trabajadores.
* **Viático diario**: **monto fijo** configurable.
* **Conceptos por día**: en una solicitud, cada día puede tener uno o más conceptos/tareas.
* **Lote**: identificador asignado por Administración para trazabilidad/pago.
* **Cuenta corriente de viáticos (por trabajador)**:

  * Si se adelantan 5 días y finalmente corresponden 4, queda **saldo deudor** (equivalente a 1 viático) para compensar en la próxima solicitud.
* **Ajuste retroactivo de monto**:

  * Si cambia el viático dentro del mes (ej.: 15/02), el sistema debe calcular diferencias para quienes tuvieron viáticos en fechas del mismo mes anteriores al cambio y generar un lote de ajuste.

---

## 3) Flujo principal (estado y versionado)

### Estados sugeridos (state machine)

* `DRAFT` (Jefe crea)
* `SUBMITTED_TO_ADMIN` (Jefe envía)
* `ADMIN_REVIEW` (Admin valida/estandariza)
* `PENDING_SIGNATURE` (listo para firma de Jefe)
* `SIGNED` (firmado)
* `SENT_TO_TREASURY` (listo para pago)
* `TREASURY_RETURNED` (Tesorería devuelve para corrección lote/fecha)
* `ADMIN_CORRECTION` (Admin crea versión corregida)
* `READY_FOR_PAYMENT` (post-corrección + firmado si aplica)
* `PAID` (Tesorería pagó)
* `CANCELLED` (anulada)

### Reglas de versionado

* Una solicitud tiene `request_id` (identidad) y `version` (1..n).
* La **versión firmada** queda **inmutable**.
* Si Tesorería solicita cambio lote/fecha:

  * Admin crea **nueva versión** (v+1) clonando datos + cambios.
  * La firma del Jefe puede requerirse de nuevo **si el cambio afecta información sensible** (definir por regla):

    * Mínimo: si cambia el lote o fecha prevista, requerir firma nuevamente (recomendado).
* Historial de versiones visible y auditado.

---

## 4) Requerimientos funcionales (MVP)

### 4.1 Gestión de solicitudes

* Crear solicitud con:

  * Área/sector, cuadrilla (texto o catálogo), ubicación, fechas (inicio/fin), cantidad de días.
  * Lista de trabajadores (1..n): trabajador_id, cuenta bancaria/cbu (si corresponde), días asignados (si varía), monto total calculado.
  * Conceptos por día: día (fecha), uno o más conceptos (texto + opcional código).
  * Adjuntos opcionales.
* Cálculo automático:

  * Monto diario vigente según fecha.
  * Total por trabajador y total de solicitud.
  * Aplicar **compensación** de cuenta corriente (si el trabajador tiene saldo deudor/acreedor).
* Envío a Administración.

### 4.2 Administración: estandarización + lote + fecha prevista

* Validaciones obligatorias antes de pasar a firma:

  * trabajadores completos, fechas consistentes, conceptos por día (mínimo 1), totales calculados.
* Asignar `lote_number` y `planned_payment_date`.
* Marcar estado `PENDING_SIGNATURE`.

### 4.3 Firma digital interna (formal, no legal)

* Cada Jefe de Área debe tener:

  * Firma cargada (imagen) **o** firma dibujada en pantalla (opcional).
* Firmar solicitud:

  * Paso de confirmación (password o PIN).
  * Guardar:

    * `signed_by_user_id`, `signed_at`, hash del documento (opcional), firma (archivo o referencia), versión firmada.
* Tras firma: bloquear edición (solo crear nueva versión).

### 4.4 Tesorería: pago y trazabilidad

* Ver solicitudes `SIGNED/READY_FOR_PAYMENT`.
* Registrar pago:

  * fecha de pago real, referencia bancaria/comprobante, adjunto opcional, notas.
* Cambios requeridos:

  * Botón “Solicitar corrección” (motivo, nueva fecha sugerida opcional).
  * Cambia estado a `TREASURY_RETURNED` y crea tarea para Administración.

### 4.5 Cuenta corriente de viáticos (saldo por trabajador)

* Modelo de saldo en “días” o en “monto”:

  * Recomendado: **monto** + referencia de cálculo (días * viático en ese momento).
* Operaciones:

  * `DEBIT` cuando se debe descontar en el futuro.
  * `CREDIT` cuando hay saldo a favor del trabajador (si aplica).
* Compensación:

  * Al crear una solicitud nueva, el sistema propone el neto y muestra: “Se descontó X por saldo previo”.

> Nota: como “por ahora solo trazabilidad del pago”, el cierre de “días efectivamente realizados” puede quedar como **ajuste manual** administrado (MVP). Ver sección 6.

### 4.6 Ajuste retroactivo por cambio de monto diario

* Admin puede crear una “Actualización de viático”:

  * mes/período, fecha efectiva desde, monto anterior, monto nuevo, motivo.
* El sistema calcula diferencias:

  * Para cada trabajador con viáticos en el período antes de la fecha efectiva, calcular (nuevo - viejo) * días afectados.
* Genera un “Lote de ajuste”:

  * listado de trabajadores + monto diferencial.
  * pasa por Admin → (firma si se requiere) → Tesorería paga como un pago especial.
* Reporte: ajustes pendientes/pagados.

### 4.7 Reportes y exportaciones (mínimo)

* Listado filtrable por:

  * estado, lote, período, jefe de área, trabajador.
* Reportes:

  * pagos por período
  * saldo por trabajador
  * solicitudes con correcciones (versionado)
  * ajustes retroactivos
* Exportación:

  * CSV/Excel de listados y liquidaciones (por lote).

---

## 5) UX / Pantallas requeridas

### Login + perfil

* Inicio sesión.
* Perfil: firma cargada (para Jefe), datos básicos.

### Jefe de Área

* Dashboard: solicitudes recientes, pendientes de firma, devoluciones.
* Crear solicitud (wizard):

  1. Datos generales
  2. Trabajadores (buscador + selección)
  3. Días/conceptos (calendario/tabla)
  4. Resumen (totales + saldos aplicados)
  5. Enviar a Administración
* Vista solicitud (solo lectura post-envío; editable si vuelve a borrador).
* Firma: modal de confirmación + previsualización del documento.

### Administración

* Bandeja: “Entrantes”, “Pendientes de estandarización”, “Pendientes de firma”, “Devueltas por Tesorería”.
* Editor de solicitud: asignar lote y fecha prevista, corregir formato, anexos.
* Crear nueva versión (desde solicitud devuelta): clon + cambios + enviar a firma.
* Módulo “Viático diario” (histórico) + “Ajustes retroactivos”.
* Reportes.

### Tesorería

* Bandeja: “Listas para pagar”, “Pagadas”, “Con observaciones”.
* Vista pago por lote:

  * listador de trabajadores y montos
  * botón “Registrar pago”
  * botón “Solicitar corrección a Administración”

### Trabajador

* Historial: pagos/ajustes/saldo actual (solo lectura).

---

## 6) Reglas y casos especiales (obligatorio)

### 6.1 Corrección lote/fecha (solo Administración)

* Tesorería nunca edita lote/fecha.
* Tesorería solo genera “Solicitud de corrección” con motivo.
* Administración crea versión nueva con lote/fecha nueva.
* Recomendación: requerir firma nuevamente.

### 6.2 “Saldo por días no realizados”

Como no hay rendición de trabajo formal aún:

* MVP: registrar “Ajuste de saldo” manual (Admin o Jefe con permiso):

  * trabajador, motivo, cantidad en días o monto, referencia de solicitud original.
* El sistema lo aplica en la próxima solicitud automáticamente.
* Dejar preparado un módulo futuro de “Cierre de viáticos” (no obligatorio en MVP).

### 6.3 Conceptos múltiples por día

* UI debe permitir:

  * agregar N conceptos por fecha
  * copiar conceptos a varios días

### 6.4 Integridad y bloqueos

* No permitir:

  * pagar una solicitud sin firma
  * editar versión firmada
  * eliminar registros con pagos asociados (solo anular)

---

## 7) Modelo de datos (Propuesta mínima)

### Tablas principales

* `users` (id, name, email, role, area_id?, signature_file_url?, signature_pin_hash?, active)
* `workers` (id, legajo, nombre, dni, cbu/cuenta, banco, provincia, estado)
* `areas` (id, nombre)
* `viatic_rate_history` (id, effective_from_date, amount, created_by, created_at, note)
* `viatic_request` (id, request_number, area_id, created_by, status, current_version, created_at)
* `viatic_request_version` (id, request_id, version_number, start_date, end_date, planned_payment_date, lote_number, notes, payload_json, created_by, created_at)
* `viatic_request_worker` (id, request_version_id, worker_id, days_count, daily_amount, gross_amount, balance_applied_amount, net_amount)
* `viatic_request_day_concept` (id, request_version_id, date, concept_text, concept_code?)
* `signature` (id, request_version_id, signed_by, signed_at, signature_asset_url, signature_method, doc_hash)
* `treasury_payment` (id, request_version_id, paid_at, payment_reference, attachment_url?, notes, created_by)
* `correction_request` (id, request_version_id, requested_by, requested_at, reason, suggested_payment_date?, status)
* `worker_viatic_balance_ledger` (id, worker_id, type DEBIT/CREDIT, amount, reason, related_request_version_id?, created_by, created_at)
* `retroactive_adjustment_batch` (id, period_month, effective_from_date, old_amount, new_amount, status, created_by, created_at)
* `retroactive_adjustment_item` (id, batch_id, worker_id, days_affected, amount_diff, status, related_payment_id?)
* `audit_log` (id, entity, entity_id, action, before_json, after_json, user_id, created_at, ip?)

> `payload_json` puede guardar snapshot del documento para auditoría (útil si cambian campos a futuro).

---

## 8) API / Acciones (contrato mínimo)

* Auth:

  * login/logout
* Solicitudes:

  * `createDraftRequest`
  * `updateDraftRequest`
  * `submitToAdmin`
  * `adminStandardizeAssignLoteAndDate`
  * `requestSignature`
  * `signRequestVersion`
  * `treasuryMarkPaid`
  * `treasuryRequestCorrection`
  * `adminCreateCorrectedVersion`
  * `cancelRequest`
* Saldos:

  * `createBalanceAdjustment`
  * `listWorkerBalance`
* Viático diario:

  * `createRateChange`
  * `generateRetroactiveAdjustmentBatch`
  * `approveRetroactiveBatch` (si requiere firma/flujo)
* Reportes/export:

  * `exportRequestsCSV`
  * `exportPaymentsCSV`

---

## 9) No funcionales (calidad)

* **Auditoría** obligatoria en: cambios de estado, cambios de lote/fecha, firma, pagos, ajustes de saldo, cambios de viático diario.
* **Seguridad**: RBAC estricto; logs; protección CSRF si aplica; rate limiting básico en auth.
* **Trazabilidad**: toda solicitud debe rastrearse por `request_number`, `version`, `lote`.
* **Performance**: listados paginados + filtros; índices DB en estado, lote, fechas.
* **Backups**: contemplar estrategia en despliegue (doc + scripts).
* **Testing mínimo**:

  * pruebas unitarias de cálculo (neto, saldo, retroactivo)
  * pruebas de flujo principal (happy path)

---

## 10) Criterios de aceptación (casos de prueba)

1. Jefe crea solicitud con 3 trabajadores, conceptos distintos por día → Admin asigna lote y fecha → Jefe firma → Tesorería paga → queda en `PAID`.
2. Tesorería devuelve por banco no hábil → Admin crea versión v+1 con nuevo lote/fecha → Jefe firma v+1 → Tesorería paga v+1.
3. Se crea saldo deudor para un trabajador (ajuste manual) → en la próxima solicitud se descuenta automáticamente.
4. Se cambia el monto del viático a mitad de mes → el sistema genera lote de ajuste con diferencias y Tesorería puede pagarlo.
5. Una versión firmada no se puede editar; solo crear nueva versión.

---

## 11) Supuestos (para que la IA no se bloquee)

* El monto del viático se gestiona por **histórico** con fecha efectiva.
* No hay confirmación del trabajador (solo registro de pagos).
* La “firma formal” es interna: imagen + confirmación; no validez legal.
* Export a CSV es suficiente para MVP; PDF puede sumarse después.

