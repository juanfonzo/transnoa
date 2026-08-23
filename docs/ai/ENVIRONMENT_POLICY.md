# Política De Entorno Y Fallbacks

## Principio

No inventar credenciales, URLs, tokens ni decisiones de infraestructura.

## Bloqueantes

- `DATABASE_URL` para validar queries, constraints o schema reales.
- identidad/autenticación real para validar permisos.
- claves de una integración para validar comportamiento real.
- autorización explícita para mutar producción o datos compartidos.

## Fallback Permitido

Sólo para demo, UI o lógica aislada cuando no distorsione el criterio. Documentar qué falta, qué se simula y qué no queda validado. Nunca presentar el selector de rol demo como prueba de autorización.

## Variables

- `.env`: valores locales reales, ignorados por Git.
- `.env.example`: contrato sin secretos.
- Vercel: variables separadas para Preview y Production cuando sea posible.

No imprimir connection strings. Antes de Prisma/SQL que pueda escribir, identificar el destino por entorno/host de forma segura y pedir confirmación si es compartido o productivo.

## Estados De Cierre

- `completada`: entorno real/equivalente validado.
- `completada-en-demo`: fallback explícito, no apta para producción.
- `bloqueada-por-entorno`: falta un recurso indispensable.
