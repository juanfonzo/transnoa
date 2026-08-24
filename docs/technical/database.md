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
- `User.notificationsSeenAt` conserva únicamente la última lectura de novedades; las alertas se derivan del estado real y no duplican eventos del dominio.

## Reglas

- Usar `Decimal` para dinero y cantidades fraccionarias; convertir a `number` sólo en límites de presentación/exportación conscientes.
- Mantener uniques de número de solicitud, legajo, email y relaciones uno-a-uno.
- Preservar versionado y referencias de auditoría.
- Crédito suma y débito resta en la lectura de saldos.
- La aplicación automática guarda el saldo con signo en la solicitud y crea el movimiento inverso en la misma transacción para impedir su reutilización; la deuda se limita para que el neto no sea negativo.
- Revisar transacciones para operaciones que cambian estado y crean pago/firma/saldo/auditoría.
- Tratar inicio, fin y fechas de pago/vigencia como fechas calendario: persistir nuevas entradas a medianoche UTC y formatearlas con UTC; los timestamps de auditoría y tramos conservan semántica de instante.
- Las tareas de la campana permanecen visibles mientras su estado siga pendiente; `notificationsSeenAt` sólo afecta novedades informativas.

## Evolución

`prisma/migrations/0_init` representa el baseline completo del schema. La Neon de pruebas existente fue comparada sin drift y marcada con `prisma migrate resolve --applied 0_init`.

`20260824120000_add_notifications_seen_at` agrega de forma idempotente el timestamp nullable de lectura. En la Neon compartida de demo se aplicó mediante el flujo manual de `db push`; una futura ejecución controlada de `migrate deploy` puede registrar la migración sin volver a crear la columna.

- POC actual: desarrollo y demo comparten la Neon de pruebas; el schema se sincroniza manualmente desde un entorno controlado y nunca durante el build de Vercel.
- Para una sincronización aprobada de la POC: identificar el destino, ejecutar `npm run prisma:validate` y luego `npm run db:push -- --skip-generate`, sin `--accept-data-loss`.
- El comando `npm run db:migrate:deploy` queda disponible para uso manual, pero no se ejecuta en `vercel-build`.
- Etapa productiva: generar migraciones nuevas con `prisma migrate dev` sobre una base/branch de desarrollo y aplicar `prisma migrate deploy` mediante un pipeline controlado con conexión directa.
- Bases existentes creadas con `db push`: ejecutar el baseline una sola vez después de comprobar cero drift.
- Bases nuevas: ejecutar directamente todas las migraciones; no usar `resolve`.
- El wrapper acepta `DIRECT_URL` o `DATABASE_URL_UNPOOLED` y rechaza URLs pooled. Consultar `docs/technical/deployment.md` para el flujo actual y la transición futura.

Nunca ejecutar push, seed o SQL sin identificar el destino y confirmar autorización si contiene datos compartidos.
