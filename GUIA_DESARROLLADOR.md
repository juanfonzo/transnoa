# Guía Del Desarrollador

## Preparación

```bash
npm ci
```

El script `prepare` configura `.githooks/pre-commit`. El hook controla encoding antes de cada commit.

Crear `.env` desde `.env.example` sin versionar valores reales y preparar el schema sólo contra la base prevista:

```bash
npm run prisma:validate
npm run prisma:generate
```

`npm run db:push` y `npm run db:seed` escriben en la base: verificar destino y autorización antes de ejecutarlos.

## Desarrollo

```bash
npm run dev
```

## Control Antes De Entregar

```bash
npm run kit:surfaces
npm run check:encoding
npm run typecheck
npm run lint
```

Agregar `npm run build`, validación Prisma y navegador según la superficie/riesgo. Si cambió el kit, ejecutar además:

```bash
npm run kit:check
npm run kit:test
```

## Convenciones

- UTF-8 y español correcto.
- Cambios pequeños y un único owner de escritura.
- Sin secretos, credenciales ni PII en commits/logs.
- Server-side para autorización y reglas críticas.
- No usar la cookie demo como prueba de permisos.
- No dejar watchers, servidores o scripts activos al cerrar.
