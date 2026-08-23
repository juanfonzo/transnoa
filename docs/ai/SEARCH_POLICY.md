# Política De Búsqueda

- Buscar server-side en conjuntos persistidos grandes.
- Normalizar espacios y mayúsculas/minúsculas; documentar reglas adicionales.
- Buscar sólo campos necesarios y autorizados.
- No exponer DNI/CBU mediante búsqueda general sin requerimiento y permiso explícitos.
- Debounce en cliente cuando la búsqueda es interactiva; submit es válido para filtros administrativos.
- Combinar búsqueda, filtros, orden y paginación en un único contrato.
- Mantener términos en query params cuando facilite compartir/retomar.
- Definir estado vacío, error y limpieza de filtros.
