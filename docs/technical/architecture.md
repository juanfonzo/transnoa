# Arquitectura Viva

## Forma General

Transnoa es una aplicación Next.js App Router monolítica desplegable en Vercel. La UI y el servidor viven en el mismo proyecto; Prisma conecta con PostgreSQL.

```text
Browser
  -> Server/Client Components (`src/app`, `src/components`)
  -> Server Actions / Route Handlers
  -> Prisma Client (`src/lib/prisma.ts`)
  -> PostgreSQL / Neon
```

## Convenciones

- Server Components para queries y composición de páginas.
- Client Components sólo para estado interactivo, modales y formularios ricos.
- Server Actions en `src/app/actions` para mutaciones.
- Route handlers en `src/app/**/route.ts` para descargas HTTP.
- Lógica de dominio crítica debe salir de componentes cuando crezca o necesite tests.
- `revalidatePath` mantiene coherencia tras mutaciones; revisar todas las rutas consumidoras.

## Riesgos

- La autenticación/autorización actual es demo.
- Varias operaciones actualizan entidades relacionadas sin transacción única.
- No hay migraciones versionadas ni tests automatizados iniciales.
- El enum de estados contiene estados no recorridos por los flujos actuales.

Actualizar este documento cuando cambien límites, runtime, autenticación o arquitectura de datos.
