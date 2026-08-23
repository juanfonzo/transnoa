# Guía De Uso Del Kit Dev IA

## Entorno

- Abrir el repositorio desde su raíz.
- Iniciar una conversación nueva después de actualizar el repo.
- Confirmar que Codex descubre las skills locales de `.agents/skills/`.
- Ejecutar `npm run kit:check`.

## Cómo Pedir Trabajo

Incluir, cuando sea posible:

- objetivo y usuario afectado;
- comportamiento actual/esperado;
- restricciones y fuera de alcance;
- criterio de éxito;
- evidencia cuando sea un bug.

Codex selecciona un rol y una skill principal. La ejecución ocurre en el hilo principal; los agentes personalizados son excepcionales.

## Ejemplos

### Cambio Liviano

```text
Cambia el texto “Guardar” por “Confirmar”. No hay lógica nueva.
```

### Bug

```text
Al registrar un pago a veces se duplica.
Esperado: un pago por versión.
Actual: aparecen dos registros.
Reproduce y demuestra la causa antes de corregir.
```

### Feature Full-Stack

```text
Agrega filtros paginados a solicitudes, manteniendo filtros en la URL y autorización server-side.
```

### Revisión

```text
Revisa este cambio contra criterios, datos sensibles, estados y regresiones. No modifiques código.
```

## Flujo

1. Codex lee `AGENTS.md` y `docs/ai/PROJECT_CONTEXT.md`.
2. Selecciona rol, skill, superficie y nivel.
3. Pregunta sólo por bloqueantes críticos.
4. Lee el contexto real y ejecuta el cambio con un owner.
5. Clasifica el diff con `npm run kit:surfaces`.
6. Verifica proporcionalmente y reporta riesgos.

## Gates

Codex debe detenerse ante una definición faltante de dinero, datos, permisos, seguridad, integración, producción, alcance contractual o criterio de aceptación que no pueda asumirse de forma segura.

## Verificación

- Nivel 0: documentación/revisión estática.
- Nivel 1: copy/UI focal.
- Nivel 2: lógica local con typecheck/lint/test o escenario.
- Nivel 3: flujo entre capas con navegador o integración.
- Nivel 4: casos positivos/negativos, permisos, datos y rollback.

Comandos útiles:

```bash
npm run kit:surfaces
npm run kit:check
npm run kit:test
npm run check:encoding
npm run typecheck
npm run lint
```

## Mejora Continua

Registrar fricciones repetibles en `docs/kit-improvement/inbox.md`. No crear una regla por cada preferencia o caso aislado.
