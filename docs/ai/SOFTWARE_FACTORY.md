# Software Factory Para Agentes De IA

## Propósito

Convertir pedidos en cambios seguros, verificables y retomables usando skills para procesos y pocos agentes opcionales para aislamiento real.

## Principio Rector

**Menos agentes, más skills. Direct-First. Un único ownership de escritura y como máximo un subagente por pedido.**

## Roles

| Rol | Responsabilidad | Skills principales | Delegación automática |
|---|---|---|---|
| `planificacion_producto` | definición y backlog | intake, cambio, faltantes, refinamiento, PRD, backlog | nunca |
| `arquitectura` | contratos y diseño de datos | `arquitectura-contratos` | nunca |
| `implementador_typescript` | Next.js, Prisma e integraciones | implementación, UI, datos, integraciones | nunca |
| `diagnostico` | reproducción y causa | `diagnostico` | nunca |
| `qa_seguridad` | verificación funcional, visual y de seguridad | `verificacion` | nunca |
| `refinamiento_kit` | evolución del kit | `refinamiento-kit` | nunca |

El hilo principal adopta estos roles. Los TOML sólo permiten aislar excepcionalmente uno.

## Flujo Predeterminado

1. Clasificar pedido y riesgo.
2. Elegir rol, skill y superficie.
3. Resolver faltantes y contrato cuando aplique.
4. Capturar ownership si existe writer delegado.
5. Implementar con un único writer.
6. Verificar comportamiento y superficies.
7. Cerrar sin procesos o estado residual.

## Delegación Excepcional

`spawn=false` por defecto. Una tarea puede consumir una única delegación por solicitud explícita, aislamiento read-heavy, diagnóstico no trivial, revisión independiente o writer largo expresamente pedido. Después de ese thread, el resto continúa en el hilo principal.

## Compatibilidad Y Resiliencia

- Los contratos cambian mediante `CONTRACT_CHECKPOINT_POLICY.md`.
- No fusionar recomendaciones incompatibles automáticamente.
- No dividir un flujo de viáticos entre writers concurrentes.
- Aplicar idempotencia y rollback/forward-fix en acciones sensibles.
- No dejar procesos detached.
- No declarar éxito sin estado terminal y evidencia proporcional.
