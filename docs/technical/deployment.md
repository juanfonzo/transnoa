# Despliegue En Vercel

## Contrato De Entorno

- `DATABASE_URL`: conexión de runtime. En Vercel/Neon conviene usar la URL con pooler.
- `DATABASE_URL_UNPOOLED`: conexión directa que expone la integración Neon/Vercel para herramientas que no deben usar el pooler.
- `DIRECT_URL`: override opcional para pipelines configurados manualmente. Tiene prioridad sobre `DATABASE_URL_UNPOOLED`.
- El wrapper usa `DIRECT_URL`, luego `DATABASE_URL_UNPOOLED` y, sólo si `DATABASE_URL` ya es directa, usa esta última. Si sólo existe una URL pooled, falla antes de migrar para evitar advisory locks retenidos por una sesión reutilizada. La aplicación siempre conserva su `DATABASE_URL` de runtime.
- Production y Preview deben usar bases o ramas Neon distintas. Una Preview nunca debe migrar la base de Production.

## Build

`vercel.json` fija `npm run vercel-build`, que ejecuta en orden:

1. `prisma generate`;
2. `prisma migrate deploy` mediante `scripts/prisma-migrate-deploy.mjs`;
3. `next build`.

La migración es idempotente: Prisma aplica únicamente archivos pendientes. No se ejecuta seed durante el build.

## Base Existente: Baseline Único

Antes del primer despliegue contra una base que ya fue creada con `prisma db push`:

1. Confirmar el destino y hacer backup/branch en el proveedor.
2. Comprobar que no existe drift:

   ```bash
   npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

3. Sólo si el resultado es `No difference detected`, registrar la migración inicial sin ejecutar su SQL:

   ```bash
   # Ejecutar en una shell donde DATABASE_URL apunte temporalmente a DIRECT_URL.
   npx prisma migrate resolve --applied 0_init
   ```

4. Verificar:

   ```bash
   npm run db:migrate:status
   npm run db:migrate:deploy
   ```

No repetir `resolve` en una base vacía. Una base nueva debe ejecutar directamente `npm run db:migrate:deploy` para crear todo el esquema.

Para comprobar la creación desde cero en un schema temporal de una base de pruebas:

```bash
ALLOW_MIGRATION_SMOKE_TEST=1 npm run test:migration:fresh
```

El script rechaza la ejecución sin el flag explícito o sin conexión directa, usa un nombre `qa_migration_*`, verifica que `0_init` quede aplicada y elimina únicamente ese schema temporal al finalizar.

## Forward-Fix Y Recuperación

- No editar una migración ya aplicada.
- Si una migración falla, inspeccionar `prisma migrate status` y crear una migración correctiva.
- Ante `P1002`, confirmar primero que `DIRECT_URL` no contiene `-pooler`; no desactivar el advisory lock para ocultar el problema.
- Usar `prisma migrate resolve --rolled-back <migración>` sólo después de confirmar que el SQL fallido fue revertido o no produjo cambios parciales.
- No usar `db push --accept-data-loss`, `migrate reset` ni seeds sobre Production.

## Checklist De Vercel

- Confirmar que la integración Neon expone `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en Production. Si el proyecto no usa la integración, configurar `DIRECT_URL` manualmente.
- Configurar URLs diferentes para Preview.
- No reutilizar la URL `-pooler` como `DIRECT_URL` ni como `DATABASE_URL_UNPOOLED`.
- Confirmar que `prisma/migrations/**` está versionado.
- Ejecutar el baseline una sola vez si la base ya tenía tablas.
- Desplegar y comprobar `/solicitudes` y `/administracion` contra el entorno correcto.
