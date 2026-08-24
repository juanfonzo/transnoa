"use server";

import { revalidatePath } from "next/cache";
import { getDemoRole } from "@/lib/demo-auth";
import { prisma } from "@/lib/prisma";

export type MarkNotificationsReadResult =
  | { ok: true }
  | { ok: false; message: string };

export async function markNotificationsRead(): Promise<MarkNotificationsReadResult> {
  try {
    const role = await getDemoRole();
    const user = await prisma.user.findFirst({
      where: { role, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!user) {
      return {
        ok: false,
        message: "No encontramos el usuario activo para este perfil demo.",
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { notificationsSeenAt: new Date() },
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    console.error("No se pudo actualizar la lectura de notificaciones.");
    return {
      ok: false,
      message: "No pudimos guardar la lectura. Volvé a intentarlo.",
    };
  }
}
