# Política De Ownership Del Diff

## Objetivo

Detectar invasión de alcance cuando se delega un writer. La ejecución directa no necesita abrir un lease.

## Ciclo

```bash
npm run kit:ownership -- begin --agent implementador_typescript
npm run kit:ownership -- check --agent implementador_typescript
npm run kit:ownership -- clear --agent implementador_typescript
```

Para acotar más:

```bash
npm run kit:ownership -- begin --agent implementador_typescript --allow "src/app/solicitudes/**"
```

El baseline vive en `.git/ai-dev-kit/` y no modifica el worktree.

## Reglas

- `ownership-map.json` define el máximo, no autoriza acciones destructivas.
- `--allow` restringe; nunca amplía.
- Paths protegidos siempre bloquean.
- Agentes read-only no deben producir diff.
- Un control fallido invalida el handoff hasta corregir o declarar bloqueo.
- Revisar igualmente cambios ajenos que ya existían antes del baseline.
