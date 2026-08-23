# Política De Autenticación Y Autorización

## Estado Actual

Transnoa usa `demo_role` en cookie y selecciona actores por rol desde la base. Esto sirve para demostración, no prueba identidad ni autoriza una acción.

## Regla De Producción

- Autenticar una identidad real server-side.
- Resolver usuario, rol y área desde sesión confiable.
- Autorizar cada Server Action y route handler; ocultar UI no alcanza.
- Validar ownership/área de la solicitud cuando corresponda.
- Denegar por defecto roles o estados no permitidos.
- Auditar actor real, acción y entidad sin exponer PII.

## Datos Sensibles

- DNI, CBU y firmas sólo para roles y usos necesarios.
- Evitar enviarlos a Client Components, logs o exportaciones generales.
- No incluir secretos, PIN ni hashes en respuestas.

## Pruebas

Cubrir permitido, denegado, sesión ausente, rol incorrecto, área ajena, estado inválido y manipulación de IDs. El modo demo no puede cerrar estos criterios.
