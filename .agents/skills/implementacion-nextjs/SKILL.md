---
name: implementacion-nextjs
description: Implementa un vertical slice Next.js frontend, servidor o full-stack. Usar cuando alcance y criterios están claros; no usar para diagnosticar fallas desconocidas, definir arquitectura ni hacer sólo review.
---

# Implementación Next.js

## Ownership

El único writer es `implementador_typescript`. No dividir UI, Server Actions y Prisma entre agentes.

## Preflight

1. Leer pedido, criterios, fuera de alcance y contrato.
2. Aplicar `docs/ai/CODE_CONTEXT_POLICY.md` y `docs/ai/REPO_SURFACES.md`.
3. Mapear archivos, callers, autorización, datos y side effects.
4. Verificar versiones instaladas; no migrar sin pedido.
5. Para UI nueva o rediseño nivel 2+, aplicar primero `diseno-ui-ux-transnoa`.
6. Cargar `evolucion-prisma-postgres` o `integracion-externa-resiliente` cuando corresponda.
7. Bloquear si falta un criterio, permiso, entorno o contrato crítico.

## Workflow

1. Definir el slice mínimo observable.
2. Preservar patrones, sistema visual y contratos.
3. Implementar end-to-end con validación cliente/servidor coherente.
4. Mantener autorización server-side y alcance por rol/área.
5. Cubrir loading, vacío, error, éxito y disabled.
6. Aplicar paginación, búsqueda y performance proporcionales.
7. Agregar tests en el seam correcto.
8. Ejecutar checks de superficies y navegador cuando aplique.
9. Revisar diff, compatibilidad y temporales.

## Referencia

Leer [references/transnoa-implementation.md](references/transnoa-implementation.md) para invariantes del proyecto.

## Cierre

El comportamiento funciona end-to-end o queda bloqueado con evidencia; contrato y alcance se respetan y no quedan procesos ni cambios ajenos.
