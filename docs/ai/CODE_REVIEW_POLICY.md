# Política De Code Review

Aplicar revisión estructurada a cambios nivel 2–4, auth/permisos, DB, dinero, PII, integraciones y features medianas/grandes.

## Revisar

- criterios y fuera de alcance;
- autorización server-side y estados válidos;
- validación, transacciones, precisión Decimal y auditoría;
- migración, seed, compatibilidad y rollback;
- loading, vacío, error, éxito, accesibilidad y responsive;
- paginación, búsqueda y performance;
- procesos, temporales y cambios ajenos.

## Reglas

- Verificar cada hallazgo contra código real.
- Rechazar edge cases especulativos y refactors sin reducción de riesgo.
- Si un fix cambia código, reejecutar pruebas focales.
- La revisión independiente es read-only; los fixes pertenecen a otra fase.

Reportar sólo hallazgos accionables, evidencia, validación y riesgos residuales.
