# Project Context

## Proyecto

- Nombre: Sistema de viáticos TRANSNOA.
- Estado: POC operativa sobre repositorio existente.
- Objetivo: gestionar solicitud, revisión, firma interna, pago, rendición y saldos de viáticos.
- Despliegue previsto: Vercel con PostgreSQL/Neon.

## Stack Real

- Next.js 16.1.3 App Router en `src/app`.
- React 19.2.3 y TypeScript 5 estricto.
- Tailwind CSS 4 vía PostCSS.
- Prisma Client/CLI 5.22.0.
- PostgreSQL/Neon mediante `DATABASE_URL` para runtime y `DIRECT_URL` para migraciones.
- Server Components para lectura, Client Components para interacción y Server Actions para mutaciones.
- Route handlers sólo para exportaciones `.xls` compatibles con Excel.
- No existe suite de tests automatizados en el estado inicial del kit.

## Estructura

- `src/app/`: páginas App Router, route handlers y Server Actions.
- `src/components/`: componentes compartidos.
- `src/lib/`: Prisma, roles, estados, formato y exportación.
- `prisma/schema.prisma`: modelo central.
- `prisma/seed.js`: datos demo.
- `scripts/`: operaciones locales; revisar alcance y base antes de ejecutar SQL.
- `requerimientos.md`: requerimientos funcionales originales.

## Módulos

- Panel por rol demo.
- Solicitudes y asignación diaria de colaboradores/conceptos.
- Administración: bandeja, lote/fecha, pagos, correcciones, tasas y retroactivos.
- Rendiciones por colaborador y tramos.
- Cuenta corriente de colaboradores.
- Tesorería y exportaciones.

## Roles Del Dominio

- `JEFE_AREA`: crea solicitudes y firma versiones listas.
- `COLABORADOR`: consulta movimientos/saldos en la experiencia prevista.
- `ADMIN`: valida, corrige, configura tasas, registra pagos y rendiciones.
- `TESORERIA`: registra pagos o devuelve solicitudes para corrección.

## Invariantes Relevantes

- La solicitud tiene un estado actual y versiones de su contenido.
- Una corrección versionada no debe perder trabajadores ni conceptos.
- Cambiar lote/fecha antes del pago invalida la firma y vuelve a firma pendiente.
- Una solicitud pagada no admite editar cantidades de viáticos.
- Medio viático sólo aplica al último día correspondiente.
- Los saldos se expresan en dinero; crédito suma y débito resta.
- Viáticos no consumidos generan débito según la decisión vigente.
- Mutaciones relevantes deben conservar trazabilidad en `AuditLog`.

## Deuda Conocida De Producción

- `demo_role` es una cookie de demostración, no autenticación ni RBAC.
- Las Server Actions buscan actores por rol y no prueban la identidad del solicitante.
- La firma usa método/demo hash; no es firma legal.
- Existe un baseline Prisma `0_init`; bases existentes requieren `migrate resolve` una sola vez y los despliegues nuevos usan `migrate deploy`.
- Los adjuntos se guardan como URL; no hay almacenamiento/upload integrado.
- DNI y CBU requieren controles de acceso, minimización y tratamiento de PII antes de producción.

## Fuera De Alcance Del Kit

- No convertir la POC en producción como efecto lateral.
- No introducir MCP, Electron, monorepo ni nuevas integraciones sin pedido.
- No cambiar cálculos o reglas de viáticos al mejorar tooling.
