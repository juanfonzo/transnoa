# Contrato: aplicación automática de cuenta corriente

## Objetivo operativo

Aplicar el saldo vigente de cada colaborador al crear una solicitud, mostrar su efecto antes del envío y evitar que el mismo saldo se utilice en más de una solicitud.

## Regla monetaria

- La cuenta corriente se calcula como créditos menos débitos.
- Un saldo deudor se descuenta del bruto de la próxima solicitud.
- Un saldo a favor se suma al bruto de la próxima solicitud.
- La deuda aplicada se limita al bruto disponible: el neto nunca puede ser negativo y el remanente continúa en cuenta corriente.
- `balanceAppliedAmount` conserva el importe con signo y `netAmount = grossAmount + balanceAppliedAmount`.
- La aplicación crea el movimiento inverso en `WorkerViaticBalanceLedger`, vinculado a la versión inicial, para consumir únicamente el importe aplicado.
- Una corrección versionada copia bruto, saldo aplicado y neto; no vuelve a consumir la cuenta corriente.

## Consistencia y trazabilidad

- Creación de solicitud, versión, integrantes, compensaciones y auditoría ocurren en una transacción serializable.
- Los conflictos concurrentes se reintentan de forma acotada; una falla revierte solicitud y movimientos completos.
- `AuditLog` registra los colaboradores y montos aplicados sin exponer DNI, CBU ni otros datos sensibles.
- No se modifica el schema: los campos y relaciones necesarios ya existen.

## Contrato UI: nueva solicitud

### Usuario y tarea principal

El Jefe de Área revisa el bruto, el saldo aplicado y el neto por colaborador antes de enviar la solicitud a Administración.

### Jerarquía

- Selección: cada colaborador informa si tiene saldo a favor, a descontar o neutro.
- Resumen: bruto, saldo aplicado y neto por colaborador.
- Total principal: neto a enviar; bruto y saldo total quedan como desglose secundario.
- Detalle posterior: la tabla de cuadrilla conserva las tres magnitudes para todos los roles habilitados.

### Estados

- Saldo cero: se informa `Sin saldo pendiente` y no se crea compensación.
- Deuda superior al bruto: neto cero y saldo deudor remanente.
- Éxito: el mensaje confirma cuántos colaboradores recibieron aplicación automática.
- Error o conflicto agotado: la transacción no deja registros parciales.
- La estimación del modal se recalcula de manera autoritativa en el servidor al enviar.

### Responsive y accesibilidad

- Compacto: neto visible primero y desglose compacto de bruto, saldo y neto dentro de cada integrante.
- Intermedio/amplio: columnas Bruto, Saldo aplicado y Neto sin ocultar acciones.
- El signo y el texto comunican el efecto del saldo; el color sólo refuerza la lectura.

## Fuera de alcance

- Nuevo formulario manual de ajustes.
- Cancelación o reversión de solicitudes, hoy no disponible en la POC.
- Cambios de autenticación, permisos productivos o schema Prisma.

## Criterios verificables

1. Una deuda de `$ 7.000` sobre un bruto de `$ 84.000` produce saldo aplicado `-$ 7.000`, neto `$ 77.000` y una compensación de crédito por `$ 7.000`.
2. Un crédito de `$ 9.000` sobre el mismo bruto produce neto `$ 93.000` y una compensación de débito por `$ 9.000`.
3. Una deuda superior al bruto deja neto cero y conserva el remanente.
4. Dos creaciones concurrentes no consumen el mismo saldo.
5. Crear una corrección conserva los importes sin generar una segunda compensación.
