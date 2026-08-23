# Reglas De Implementación De Transnoa

## Stack

- Next.js App Router bajo `src/app`, React y TypeScript estricto.
- Server Components por defecto; Client Components sólo para interacción.
- Server Actions en `src/app/actions`; route handlers para descargas o contratos HTTP reales.
- Prisma/Postgres como persistencia; `src/lib/prisma.ts` centraliza el cliente.
- Tailwind CSS 4 y patrones existentes; evitar estilos inline y dependencias nuevas.

## Dominio

- `ViaticRequest` conserva estado y número; `ViaticRequestVersion` conserva el contenido versionado.
- Cambiar lote/fecha antes del pago invalida la firma y vuelve a `PENDING_SIGNATURE`.
- Una solicitud pagada no admite modificar cantidad de viáticos.
- Medio viático sólo se aplica al último día correspondiente.
- Viáticos no consumidos generan un débito en la cuenta corriente según la decisión vigente.
- Montos, saldos, pagos y retroactivos requieren revisión de precisión Decimal y casos negativos.
- `AuditLog` debe acompañar mutaciones relevantes.

## Seguridad

- El selector de rol actual es sólo demo; no constituye autenticación ni autorización.
- No presentar una acción sensible como segura sin un control real server-side.
- DNI, CBU y firma son sensibles; minimizar selección, logs y exportación.

## UI

- Copy en español y consistente con el dominio.
- Reutilizar `Modal`, `SubmitButton`, `StatusPill`, layout y tonos actuales.
- Acciones asíncronas deben informar estado y evitar doble envío.
- Tablas anchas deben conservar accesibilidad y comportamiento responsive.
