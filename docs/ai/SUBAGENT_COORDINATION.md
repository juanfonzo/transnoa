# Coordinación De Subagentes

## Direct-First

- El rol se adopta en el hilo principal.
- No delegar para acelerar trabajo que comparte contratos o archivos.
- No usar arquitectura → writer → QA como cadena de agentes.
- No permitir dos writers del mismo flujo.

## Modos Permitidos

- análisis read-only aislado;
- diagnóstico read-only no trivial;
- revisión independiente read-only;
- writer largo solicitado explícitamente y con ownership único.

## Handoff

El prompt delegado debe incluir objetivo, fuera de alcance, entradas, archivos permitidos, contrato, evidencia esperada y stop condition. El resultado debe ser terminal, verificable y terminar con `HANDOFF_FINAL`.

Las recomendaciones vuelven al hilo principal; un subagente no amplía autorización ni inicia otros agentes.
