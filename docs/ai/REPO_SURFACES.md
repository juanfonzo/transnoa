# Superficies Del Repositorio

La configuración ejecutable vive en `repo-surfaces.json`.

- `nextjs-app`: páginas, componentes, librerías y configuración web.
- `prisma-postgres`: schema, seed y acceso Prisma.
- `ai-dev-kit`: agentes, skills, policies y validadores.
- `automation`: hooks, workflows y scripts operativos fuera del kit.

Usar `npm run kit:surfaces` para clasificar el diff y elegir checks proporcionales. Una ruta puede pertenecer a más de una superficie cuando el cambio cruza contratos.
