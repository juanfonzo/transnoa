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
- Tratar inicio, fin y fechas de pago/vigencia como fechas calendario: persistir nuevas entradas a medianoche UTC y formatearlas con UTC; los timestamps de auditoría y tramos conservan semántica de instante.

## Evolución

`prisma/migrations/0_init` representa el baseline completo del schema. La Neon de pruebas existente fue comparada sin drift y marcada con `prisma migrate resolve --applied 0_init`.

- Desarrollo de cambios de schema: generar migraciones nuevas con `prisma migrate dev` sobre una base/branch de desarrollo.
- Preview y Production: aplicar únicamente `prisma migrate deploy`.
- Bases existentes creadas con `db push`: ejecutar el baseline una sola vez después de comprobar cero drift.
- Bases nuevas: ejecutar directamente todas las migraciones; no usar `resolve`.
- Para despliegues, el wrapper acepta `DIRECT_URL` o la variable oficial `DATABASE_URL_UNPOOLED` de Neon/Vercel. Consultar `docs/technical/deployment.md` para precheck, Vercel y recuperación.

Nunca ejecutar push, seed o SQL sin identificar el destino y confirmar autorización si contiene datos compartidos.
