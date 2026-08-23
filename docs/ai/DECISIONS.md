# Decisiones Técnicas Durables

## 2026-08-23 — Factory Dev IA Adaptada

- Estado: aceptada.
- Decisión: adoptar un kit Direct-First basado en Gesuite y adaptado a una única superficie Next.js/Prisma/Postgres.
- Motivo: aumentar consistencia, seguridad, contexto y verificabilidad sin incorporar la complejidad de MCP, Electron o agentes operativos inexistentes.
- Consecuencia: la ejecución ordinaria queda en el hilo principal; las skills son el mecanismo principal y la delegación es excepcional.
- Reversa: eliminar la configuración y scripts del kit preservando antes las políticas específicas de Transnoa.
