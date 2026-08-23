# Política De Cierre Y Limpieza

Una tarea termina cuando comportamiento, diff, procesos, documentación y lifecycle quedan coherentes.

## Checklist

- [ ] criterios, contrato y fuera de alcance cumplidos;
- [ ] checks de superficies afectadas;
- [ ] casos negativos según riesgo;
- [ ] UI validada en navegador cuando aplica;
- [ ] ownership verificado/liberado si se abrió lease;
- [ ] sin procesos detached, instrumentación ni temporales;
- [ ] riesgos residuales explícitos;
- [ ] puntos de verdad actualizados sólo si corresponde;
- [ ] si cambió el kit: `npm run kit:check` y `npm run kit:test`;
- [ ] cero subagentes activos si hubo delegación.

No declarar terminado con un agente, test o build activo, un contrato incompatible o una mutación de entorno no confirmada.
