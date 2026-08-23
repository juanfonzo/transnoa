# Política De Testing

## Niveles

| Nivel | Ejemplo | Evidencia mínima |
|---|---|---|
| 0 | docs/análisis | revisión estática y links válidos |
| 1 | copy/estilo | check focal y, si visible, inspección rápida |
| 2 | lógica local | typecheck/lint y test o escenario focal |
| 3 | flujo entre capas | checks técnicos + flujo real feliz y negativo |
| 4 | dinero/datos/permisos/migración | positivos, negativos, autorización, datos y rollback |

## Selección

- Ejecutar primero el check más focal que puede fallar por el cambio.
- Usar `npm run kit:surfaces` para descubrir comandos candidatos.
- No usar build completo como sustituto de tests de reglas.
- No validar permisos con el selector demo como si fuera autenticación real.
- No ejecutar operaciones destructivas o contra producción para obtener evidencia.

## UI

Un cambio visible nivel 2+ requiere navegador cuando el entorno lo permite: ancho compacto/intermedio/amplio, teclado/foco y estados aplicables.

## Cierre

Registrar comandos, resultado, escenario y lo no validado. Si el entorno impide una prueba necesaria, declarar el bloqueo o el alcance demo.
