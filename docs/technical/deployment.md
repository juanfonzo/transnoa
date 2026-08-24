# Despliegue En Vercel

## Contrato Actual De La Demo

- `DATABASE_URL` es la única variable de base obligatoria en Vercel y puede usar el pooler de Neon.
- Desarrollo y la demo desplegada comparten actualmente una base Neon de pruebas ya preparada.
- El build de Vercel no modifica schema ni datos: no ejecuta `migrate deploy`, `db push` ni seed.
- `DATABASE_URL_UNPOOLED` y `DIRECT_URL` quedan reservadas para migraciones manuales futuras; no son necesarias para desplegar la POC actual.

## Build

`vercel.json` fija `npm run vercel-build`, que delega en `npm run build` y ejecuta:

1. `prisma generate`;
2. `next build`.

Esto evita que una instalación o redeploy cambie accidentalmente la base compartida. La sincronización del schema es una operación previa, explícita y separada del despliegue.

## Sincronización Manual De La POC

Cuando exista un cambio de `prisma/schema.prisma` aprobado para esta demo:

1. Identificar el host y la base de destino sin exponer credenciales.
2. Confirmar que se trata de la Neon de pruebas compartida y que existe autorización.
3. Validar el schema y aplicar el cambio desde un entorno controlado:

   ```bash
   npm run prisma:validate
   npm run db:push -- --skip-generate
   ```

4. No usar `--accept-data-loss`. Si Prisma advierte pérdida de datos, detenerse y diseñar una migración o forward-fix explícito.
5. Ejecutar `npm run vercel-build` y recién después desplegar.

No agregar `db push` al build de Vercel: aunque la base sea de pruebas, cada redeploy debe ser repetible y no mutante.

## Migraciones Para Una Etapa Productiva

El comando `npm run db:migrate:deploy` y su wrapper se mantienen disponibles, pero no forman parte del build. Antes de separar ambientes o pasar a producción se debe volver a un pipeline de migraciones con conexión directa y ramas Neon distintas para Preview y Production.

Para una base existente creada con `prisma db push`, el baseline se registra una sola vez antes del primer despliegue:

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

No repetir `resolve` en una base vacía. Una base nueva debe ejecutar directamente `npm run db:migrate:deploy` para crear todo el esquema desde un entorno controlado.

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

- Configurar `DATABASE_URL` en el entorno objetivo.
- Confirmar que el Build Command sea `npm run vercel-build` y que no exista otro paso de migración en Vercel.
- Sincronizar manualmente el schema antes del deploy sólo si hubo un cambio aprobado.
- No ejecutar seed durante el build.
- Desplegar y comprobar `/solicitudes` y `/administracion` contra el entorno correcto.
