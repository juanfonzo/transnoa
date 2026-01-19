"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateWorkerResult = {
  error?: string;
};

export async function createWorker(formData: FormData): Promise<CreateWorkerResult> {
  const name = formData.get("name");
  const legajo = formData.get("legajo");
  const dni = formData.get("dni");
  const cbu = formData.get("cbu");
  const bank = formData.get("bank");
  const province = formData.get("province");

  if (typeof name !== "string" || name.trim() === "") {
    return { error: "El nombre es obligatorio." };
  }
  if (typeof legajo !== "string" || legajo.trim() === "") {
    return { error: "El legajo es obligatorio." };
  }

  const existing = await prisma.worker.findUnique({ where: { legajo } });
  if (existing) {
    return { error: "Ya existe un trabajador con ese legajo." };
  }

  await prisma.worker.create({
    data: {
      name: name.trim(),
      legajo: legajo.trim(),
      dni: typeof dni === "string" && dni.trim() !== "" ? dni.trim() : undefined,
      cbu: typeof cbu === "string" && cbu.trim() !== "" ? cbu.trim() : undefined,
      bank: typeof bank === "string" && bank.trim() !== "" ? bank.trim() : undefined,
      province:
        typeof province === "string" && province.trim() !== ""
          ? province.trim()
          : undefined,
      status: "Activo",
    },
  });

  revalidatePath("/solicitudes");
  revalidatePath("/colaboradores");

  return {};
}
