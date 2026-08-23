# Política De Performance

- Medir antes de optimizar problemas no triviales.
- Evitar N+1 y payloads Prisma sobredimensionados; usar `select/include` proporcional.
- No cargar históricos completos en páginas de uso frecuente.
- Paginar listados que puedan crecer y filtrar server-side.
- Mantener cálculos de dinero y balances cerca de la fuente de verdad; evitar duplicarlos en cliente.
- Evaluar índices al agregar filtros por estado, fechas, lote, colaborador o relaciones frecuentes.
- No introducir caché sobre datos mutables de pagos/saldos sin estrategia de invalidación.
- Registrar baseline, cambio y resultado en fixes de lentitud.
