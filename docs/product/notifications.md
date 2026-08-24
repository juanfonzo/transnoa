# Contrato UI: notificaciones simples por usuario

## Objetivo operativo

Avisar en el encabezado cuándo el perfil activo debe realizar una acción o tiene información nueva, sin crear una bandeja paralela al circuito de viáticos.

## Usuario y tarea principal

- Jefe de Área: firmar versiones pendientes y enterarse de pagos o devoluciones de su área.
- Administración: validar solicitudes y resolver devoluciones/correcciones.
- Tesorería: registrar pagos de solicitudes firmadas.
- Colaborador: enterarse de pagos y movimientos de su cuenta personal demo.

## Referencia canónica

- Estados y eventos de `ViaticRequest`, `Signature`, `TreasuryPayment`, `CorrectionRequest` y `WorkerViaticBalanceLedger`.
- Actor demo activo resuelto desde `demo_role` y el primer `User` activo del rol.
- El colaborador demo mantiene la correspondencia existente con el legajo `1001`.

## Funcionalidad a preservar

- Acciones: cada alerta navega al detalle o a la bandeja operativa real.
- Server Action: `markNotificationsRead` sólo actualiza `User.notificationsSeenAt`.
- Permisos: la campana respeta el rol demo actual; no reemplaza autenticación ni RBAC productivo.
- Side effects: ninguna alerta modifica estados, pagos, firmas, saldos o auditoría del dominio.

## Jerarquía

- Información primaria: contador visible sobre la campana.
- Acción primaria: abrir la solicitud que requiere intervención.
- Acción secundaria: marcar novedades informativas como leídas.
- Las tareas activas no se pueden ocultar: desaparecen cuando cambia el estado que las origina.

## Componentes y patrones reutilizados

- Encabezado institucional, botones circulares, bordes slate y tonos semánticos amber/sky/rose.
- Popover compacto con lista abierta, fecha, descripción breve y enlace real.
- SVG local sin dependencia de iconos adicional.

## Estados

- Loading/disabled: “Guardando…” y control deshabilitado durante la marca de lectura.
- Vacío: “Todo al día”.
- Error: la campana sigue disponible y explica que no pudo actualizar alertas.
- Éxito: contador informativo se limpia y se anuncia con `aria-live`.
- Permiso insuficiente: lo mantiene la página de destino; la campana nunca enlaza módulos ajenos al rol.

## Responsive

- Compacto: campana a la derecha del selector y panel limitado al viewport.
- Intermedio y amplio: popover alineado al borde derecho del shell.

## Accesibilidad

- Botón con contador en nombre accesible, `aria-expanded` y `aria-controls`.
- Cierre por Escape, retorno de foco y cierre al pulsar fuera.
- Estado comunicado por texto además del color.

## Fuera de alcance visual

- Push, correo, WebSocket, polling, preferencias por tipo o historial ilimitado.
- Tabla `Notification`, borrado individual o autenticación productiva.

## Evidencia requerida

- Cuatro roles en 390, 768 y 1440 px.
- Tarea activa que permanece marcada y novedad informativa que puede marcarse como leída.
- Navegación real, Escape, foco, consola limpia y persistencia después de recargar.
