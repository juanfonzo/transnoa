-- La lectura es una preferencia aditiva por usuario; no duplica eventos del dominio.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "notificationsSeenAt" TIMESTAMP(3);
