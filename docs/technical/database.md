# Datos Y Prisma

## Núcleo

- `User`, `Area`, `Worker`.
- `ViaticRequest` y `ViaticRequestVersion`.
- `ViaticRequestWorker` y `ViaticRequestDayConcept`.
- `Signature`, `TreasuryPayment`, `CorrectionRequest`.
- `WorkerViaticBalanceLedger`.
- `ViaticRateHistory`, `RetroactiveAdjustmentBatch/Item`.
- `ViaticRendition` y `ViaticRenditionLeg`.
- `AuditLog`.

## Reglas

- Usar `Decimal` para dinero y cantidades fraccionarias; convertir a `number` sólo en límites de presentación/exportación conscientes.
- Mantener uniques de número de solicitud, legajo, email y relaciones uno-a-uno.
- Preservar versionado y referencias de auditoría.
- Crédito suma y débito resta en la lectura de saldos.
- Revisar transacciones para operaciones que cambian estado y crean pago/firma/saldo/auditoría.

## Evolución

Actualmente no existe `prisma/migrations/`; `db:push` aplica schema directamente. Antes de producción sostenida, adoptar una estrategia de migraciones versionadas y separación Development/Preview/Production.

Nunca ejecutar push, seed o SQL sin identificar el destino y confirmar autorización si contiene datos compartidos.
