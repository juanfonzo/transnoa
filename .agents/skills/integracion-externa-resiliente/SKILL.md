---
name: integracion-externa-resiliente
description: Implementa webhooks, APIs y sincronizaciones externas resilientes. Usar para proveedores externos; no usar para llamadas internas simples ni sin contrato de seguridad.
---

# Integración Externa Resiliente

## Workflow

1. Verificar documentación primaria y versión real de la API.
2. Definir autenticación, renovación, firma y almacenamiento seguro.
3. Diseñar idempotencia, deduplicación y eventos fuera de orden.
4. Aplicar timeout, retry con backoff/jitter y clasificación de errores.
5. Respetar rate limits y evitar tormentas de reintentos.
6. Persistir estado y correlation IDs cuando aporte trazabilidad.
7. Implementar replay, reconciliación y recuperación manual.
8. Evitar secretos/PII en logs.
9. Probar duplicados, firma inválida, timeout, 429, 5xx y respuesta parcial.

## Reglas

- No asumir exactly-once.
- No responder éxito antes del punto durable definido.
- No reintentar errores permanentes como transitorios.
- No acoplar UI directamente al proveedor si corresponde un adaptador server-side.

## Cierre

La integración tolera duplicados, orden variable y fallas transitorias, con observabilidad y recuperación.
