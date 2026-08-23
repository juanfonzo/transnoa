# Matriz De Activación Direct-First

La matriz selecciona rol y skill; no crea automáticamente un subagente.

| Pedido | Rol | Skill principal | Apoyo condicional |
|---|---|---|---|
| Iniciativa/propuesta amplia | `planificacion_producto` | `intake-proyecto` | `faltantes` |
| Cambio incremental | `planificacion_producto` | `cambio-cliente` | refinamiento si es ambiguo |
| Ambigüedades críticas | `planificacion_producto` | `faltantes` | — |
| Pedido macro | `planificacion_producto` | `refinamiento-backlog` | — |
| PRD | `planificacion_producto` | `prd-tecnico` | — |
| Roadmap/backlog | `planificacion_producto` | `backlog-tecnico` | — |
| Arquitectura/contrato | `arquitectura` | `arquitectura-contratos` | checkpoint de contrato |
| Next.js/full-stack | `implementador_typescript` | `implementacion-nextjs` | UI/Prisma/integración |
| UI nueva o rediseño nivel 2+ | `implementador_typescript` | `diseno-ui-ux-transnoa` | luego implementación |
| Prisma/Postgres | `implementador_typescript` | `evolucion-prisma-postgres` | implementación Next.js |
| Integración externa | `implementador_typescript` | `integracion-externa-resiliente` | implementación Next.js |
| Bug/regresión | `diagnostico` | `diagnostico` | fix posterior |
| QA/review | `qa_seguridad` | `verificacion` | read-only si es delegado |
| Kit Dev IA | `refinamiento_kit` | `refinamiento-kit` | — |

## Escalado

- Datos, dinero, pagos, saldos, permisos o PII elevan la verificación, no la cantidad de agentes.
- UI nivel 2+ requiere contrato visual y evidencia en navegador.
- Si cambia un contrato, aplicar `CONTRACT_CHECKPOINT_POLICY.md`.
- Si ya se usó un subagente, cualquier fase posterior sigue en el hilo principal.
