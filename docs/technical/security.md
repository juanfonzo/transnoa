# Seguridad

## Estado

La aplicación es POC. `demo_role` permite elegir una experiencia y las mutaciones buscan un usuario de ese rol. No existe login ni vínculo confiable entre request y actor.

## Objetivo Antes De Producción

- sesión autenticada y segura;
- autorización server-side por rol, área, recurso y estado;
- protección y minimización de DNI, CBU y firma;
- validación estructurada de inputs;
- auditoría con actor real;
- separación de entornos/base;
- política de retención y exportación;
- manejo de errores sin filtrar información sensible.

## Regla

Ninguna feature puede afirmar seguridad productiva mientras dependa del selector de rol demo. Registrar esa limitación en criterios y cierre.
