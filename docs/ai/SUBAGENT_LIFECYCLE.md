# Ciclo De Vida De Subagentes

## Regla

La ejecución directa es el default. Cada pedido admite cero o un `spawn_agent` total si existe autorización y `DELEGATION_GATE` completo.

## Gate Previo

- presupuesto `unused`;
- cero agentes activos;
- razón permitida y beneficio material;
- skill, agente, modo, alcance y ownership;
- entrada, salida, evidencia y condición de parada.

## Secuencia

1. Registrar el gate y marcar presupuesto `active`.
2. Crear un único agente.
3. No editar en paralelo si es writer.
4. Usar `wait_agent` hasta `done`, `failed` o `stopped`; timeout no es terminal.
5. Recolectar `HANDOFF_FINAL: listo|bloqueado|fallido` y revisar evidencia/diff.
6. Enviar correcciones al mismo thread si sigue disponible; nunca crear otro.
7. Cerrar o detener el thread con la capacidad disponible del runtime.
8. Marcar presupuesto `consumed` y confirmar cero activos.
9. Continuar fases restantes en el hilo principal.

## Bloqueo

Si el estado sigue activo: `BLOQUEADO: subagente aún activo; no se declara cierre.`

Cerrar o detener el primer thread no repone el presupuesto de la tarea.
