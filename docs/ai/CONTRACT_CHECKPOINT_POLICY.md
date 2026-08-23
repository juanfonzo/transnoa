# Checkpoints De Contrato

## Cuándo Aplica

- flujo entre UI, Server Action y Prisma;
- datos, dinero, permisos, firma o integración;
- schema o consumidor externo;
- nivel 3/4.

## Contrato Mínimo

- versión/fecha y owner;
- alcance y fuera de alcance;
- inputs/outputs tipados;
- IDs, rol y autorización;
- invariantes y side effects;
- estados, errores y casos negativos;
- idempotencia/reintentos cuando aplica;
- compatibilidad con consumidores;
- migración y rollback/forward-fix;
- evidencia de aceptación.

## Estados

- `candidato`;
- `congelado`;
- `cambio-requerido`;
- `obsoleto`.

## Regla De Cambio

Un implementador no modifica silenciosamente un contrato congelado. Debe devolver:

```text
CAMBIO_DE_CONTRATO_REQUERIDO
Motivo:
Impacto:
Decisión necesaria:
```

El hilo principal revisa la decisión antes de continuar. No se crea otro writer para reinterpretar el contrato.
