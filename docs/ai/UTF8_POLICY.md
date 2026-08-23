# Política UTF-8

Todo texto, código, SQL, Prisma, JSON, YAML, TOML, seed, fixture, export y copy visible debe conservarse en UTF-8.

## Reglas

- Preservar acentos, eñes, signos de apertura y símbolos.
- No normalizar español a ASCII.
- Si aparece texto con señales típicas de codificación rota, detener la edición y corregir el origen antes de continuar.
- No hacer reemplazos masivos destructivos sobre archivos con texto visible.
- Revisar texto pegado desde PDF, Word, WhatsApp o planillas.
- No reescribir un archivo no relacionado sólo para normalizar encoding.

Ejecutar `npm run check:encoding` antes de cerrar cambios textuales amplios.
