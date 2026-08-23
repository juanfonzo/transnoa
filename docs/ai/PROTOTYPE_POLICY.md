# Política De POC Y Producción

## Regla

La POC puede simplificar identidad, firma o entorno para demostrar el flujo, pero debe mantener visibles sus límites.

## Permitido En POC

- selector de rol claramente rotulado como demo;
- usuarios y datos ficticios;
- firma interna simulada;
- URLs de adjunto como contrato provisional;
- `prisma db push` en un entorno de desarrollo controlado.

## No Permitido Como Producción

- confiar en la cookie demo para permisos;
- usar actores buscados sólo por rol;
- compartir bases Preview/Production sin decisión;
- ejecutar seeds o limpiezas automáticamente;
- tratar firma demo como firma legal;
- exponer DNI/CBU sin autorización y minimización.

Todo cierre debe declarar `completada-en-demo` cuando una simplificación impida afirmar aptitud productiva.
