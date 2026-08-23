# AGENTS.md

Codex trabaja en Transnoa mediante una software factory liviana para agentes de desarrollo.

## Precedencia

- Aplican primero las instrucciones del sistema, del entorno y del usuario.
- Este archivo define invariantes del repositorio.
- Las skills definen workflows; los agentes personalizados sólo aíslan trabajo excepcional; las policies contienen reglas condicionales.
- Ante conflictos sobre datos, dinero, permisos, seguridad, alcance, producción o destrucción, detenerse y pedir una decisión.

## Alcance Del Kit Dev IA

En una tarea explícita de evolución del kit se pueden modificar `AGENTS.md`, `.agents/skills/**`, `.codex/**`, `docs/ai/**`, `docs/kit-improvement/**`, `scripts/ai-dev-kit/**`, `.githooks/**`, los workflows de control del kit y los scripts `kit:*` de `package.json`.

No modificar como parte de una tarea ordinaria del producto:

- políticas, agentes, skills o validadores del kit;
- `CONTINUITY.md`, salvo que el trabajo deba quedar retomable o una instrucción superior lo exija;
- secretos, archivos `.env` reales, datos productivos o configuración externa;
- workflows de CI/CD, salvo pedido explícito.

## Inicio Mínimo

1. Leer `docs/ai/PROJECT_CONTEXT.md`.
2. Leer el pedido o artefacto activo.
3. Leer `CONTINUITY.md` cuando exista y mantenerlo breve si la tarea continúa entre turnos.
4. Consultar `docs/ai/ACTIVATION_MATRIX.md` si el rol o la skill no son evidentes.
5. Cargar una skill principal desde `.agents/skills/`.
6. Leer sólo policies, documentos técnicos y código afectados.

No leer por defecto `docs/ai/MANIFEST.md`, archivos históricos, guías largas ni todo el backlog.

## Diseño De La Factory

**Menos agentes, más skills. Direct-First. Una fase, un rol primario y un único ownership de escritura.**

El hilo principal es el coordinador y ejecutor predeterminado. Adopta el rol correcto y aplica la skill sin crear un subagente. Los agentes personalizados son perfiles opcionales:

- `planificacion_producto`: intake, cambios, faltantes, PRD y backlog extensos;
- `arquitectura`: exploración y contratos read-only;
- `implementador_typescript`: writer TypeScript para Next.js, Prisma e integraciones;
- `diagnostico`: reproducción y causa read-only cuando se delega;
- `qa_seguridad`: revisión independiente read-only;
- `refinamiento_kit`: auditoría extensa del kit.

## Direct-First Y Delegación

- Elegir primero skill, rol, riesgo, superficie y ownership.
- La ejecución directa es el default para todos los niveles.
- `spawn=false` salvo beneficio material y autorización compatible con el entorno.
- No crear un subagente sólo para cambiar de rol, cumplir un checklist o repartir frontend/backend/datos.
- No permitir escritores concurrentes sobre el mismo comportamiento, contrato o archivos relacionados.
- Una tarea admite como máximo un subagente total; cerrar o detener ese thread no repone el presupuesto.
- Los agentes no crean otros subagentes.

Antes de delegar registrar el `DELEGATION_GATE`: razón, beneficio, skill, agente, modo, alcance, ownership, entrada, salida, evidencia y condición de parada. Razones admisibles:

- solicitud explícita del usuario;
- aislamiento de contexto read-heavy;
- diagnóstico no trivial read-only;
- revisión independiente read-only;
- writer largo y aislado, sólo por solicitud explícita.

Cuando se delega, esperar con `wait_agent` hasta estado terminal, revisar el handoff y confirmar cero agentes activos antes de editar, continuar otra fase o responder. Si el runtime ofrece una operación explícita de cierre, usarla; si no, confirmar estado terminal con las herramientas disponibles. Nunca declarar terminado con un agente o proceso todavía activo.

## Routing Y Ownership

- Planificación y producto → `planificacion_producto`.
- Arquitectura, contratos y diseño de datos → `arquitectura`.
- Next.js, UI, Prisma e integraciones TypeScript → `implementador_typescript`.
- Bugs y regresiones → `diagnostico`.
- QA, aceptación y seguridad → `qa_seguridad`.
- Evolución del kit → `refinamiento_kit`.

Asignar un rol no implica delegar. Antes de un writer delegado usar `npm run kit:ownership -- begin --agent <rol>`; después ejecutar `check` y `clear`. Seguir `docs/ai/SOFTWARE_FACTORY.md`, `docs/ai/OWNERSHIP_POLICY.md` y `docs/ai/SUBAGENT_LIFECYCLE.md`.

## Contratos Y Niveles De Riesgo

- **Nivel 0:** documentación o análisis sin código.
- **Nivel 1:** copy, estilo o cambio localizado sin contrato nuevo.
- **Nivel 2:** lógica local o slice acotado.
- **Nivel 3:** flujo entre capas o integración.
- **Nivel 4:** dinero, datos críticos, permisos, seguridad, migración o producción.

El nivel determina verificación, no delegación. Antes de editar deben estar claros objetivo, usuario, comportamiento, alcance, datos/dinero/permisos, criterios de aceptación, superficie, entorno, pruebas y rollback proporcional.

Toda dependencia entre fases consume el mismo contrato congelado. Si debe cambiar, devolver `CAMBIO_DE_CONTRATO_REQUERIDO` y detener la implementación hasta revisar `docs/ai/CONTRACT_CHECKPOINT_POLICY.md`.

## Principios De Transnoa

- Mantener UTF-8 y español correcto.
- Respetar las versiones instaladas; no migrar dependencias sin pedido explícito.
- Mantener Postgres + Prisma como fuente de verdad.
- El estado actual es una POC: el selector de rol y la firma demo no son autenticación/autorización productivas.
- Toda mutación debe validar autorización server-side antes de un despliegue real.
- Tratar DNI, CBU, firmas y movimientos de viáticos como datos sensibles.
- No exponer secretos ni PII en logs, reportes o respuestas por defecto.
- Preservar trazabilidad, versionado de solicitudes, estados y `AuditLog`.
- No alterar cálculos, saldos, pagos o rendiciones sin revisar invariantes y casos negativos.
- Para UI nivel 2+, aplicar `diseno-ui-ux-transnoa`, `docs/ai/UI_VALIDATION_POLICY.md` y `docs/technical/frontend.md`.
- Para Prisma o integraciones externas, cargar la skill específica.
- Preferir vertical slices, contratos tipados y cambios pequeños; evitar abstracciones especulativas.
- `.env` contiene valores reales locales; `.env.example` sólo documenta el contrato.

## Seguridad Del Worktree

- Revisar cambios locales antes de editar.
- No sobrescribir, revertir ni limpiar trabajo ajeno.
- Detenerse si otro cambio toca el mismo archivo o contrato.
- No usar operaciones destructivas ni mutar producción sin autorización explícita.
- No dejar procesos detached, watchers, servidores o tests persistentes.
- Mantener cada diff acotado al pedido.

## Verificación Y Cierre

Antes de declarar terminado:

- comparar criterios, contrato y fuera de alcance;
- revisar diff y ownership;
- ejecutar `npm run kit:surfaces` y checks proporcionales;
- probar casos negativos para permisos, datos, dinero e integraciones;
- validar UI real en navegador cuando aplique;
- eliminar instrumentación, procesos y temporales;
- declarar riesgos residuales y actualizar sólo puntos de verdad afectados;
- ejecutar `npm run kit:check` y `npm run kit:test` si cambió el kit;
- confirmar cero agentes activos si hubo delegación.

Para validación local usar `http://localhost:<puerto>` y el navegador disponible en el entorno. Los tests técnicos complementan, pero no sustituyen la evidencia visual cuando el flujo visible es parte del criterio.

El reporte final debe indicar qué cambió, archivos relevantes, validación, riesgos y un único próximo paso. No declarar éxito sin evidencia.
