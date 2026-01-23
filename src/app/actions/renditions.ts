"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type RenditionActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  balanceCount?: number;
};

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTime(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const [hours, minutes] = value.split(":").map((chunk) => Number(chunk));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return { hours, minutes };
}

function parseDateTime(dateValue: FormDataEntryValue | null, timeValue: FormDataEntryValue | null) {
  const baseDate = parseDate(dateValue);
  if (!baseDate) {
    return null;
  }
  const time = parseTime(timeValue);
  if (!time) {
    return baseDate;
  }
  baseDate.setHours(time.hours, time.minutes, 0, 0);
  return baseDate;
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDecimalInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function getStringList(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

async function getAdminActor() {
  return prisma.user.findFirst({ where: { role: "ADMIN" } });
}

function getRenditionFields(formData: FormData) {
  const reason = formData.get("reason");
  const vehiclePlate = formData.get("vehiclePlate");
  const attachmentUrl = formData.get("attachmentUrl");
  const notes = formData.get("notes");
  const consumedViaticos = parseDecimalInput(formData.get("consumedViaticos"));

  return {
    reason: typeof reason === "string" ? reason : null,
    vehiclePlate: typeof vehiclePlate === "string" ? vehiclePlate : null,
    attachmentUrl: typeof attachmentUrl === "string" ? attachmentUrl : null,
    notes: typeof notes === "string" ? notes : null,
    consumedViaticos,
  };
}

function isHalfStep(value: number) {
  return Math.round(value * 2) / 2 === value;
}

function getRenditionBalanceReason(requestWorkerId: string) {
  return `Saldo rendicion ${requestWorkerId}`;
}

async function upsertRenditionBalance({
  requestWorkerId,
  requestVersionId,
  workerId,
  dailyAmount,
  availableDays,
  consumedViaticos,
  actorId,
}: {
  requestWorkerId: string;
  requestVersionId: string;
  workerId: string;
  dailyAmount: Prisma.Decimal;
  availableDays: number;
  consumedViaticos: number | null;
  actorId: string;
}) {
  if (consumedViaticos === null) {
    return;
  }
  if (consumedViaticos < 0 || !isHalfStep(consumedViaticos)) {
    return;
  }
  if (availableDays < consumedViaticos) {
    return;
  }

  const unusedDays = availableDays - consumedViaticos;
  const reason = getRenditionBalanceReason(requestWorkerId);

  const existing = await prisma.workerViaticBalanceLedger.findFirst({
    where: {
      workerId,
      relatedRequestVersionId: requestVersionId,
      reason,
    },
  });

  if (unusedDays <= 0) {
    if (existing) {
      await prisma.workerViaticBalanceLedger.delete({ where: { id: existing.id } });
    }
    return;
  }

  const amount = dailyAmount.mul(new Prisma.Decimal(unusedDays));

  if (existing) {
    await prisma.workerViaticBalanceLedger.update({
      where: { id: existing.id },
      data: {
        amount,
        type: "DEBIT",
        reason,
      },
    });
    return;
  }

  await prisma.workerViaticBalanceLedger.create({
    data: {
      workerId,
      type: "DEBIT",
      amount,
      reason,
      relatedRequestVersionId: requestVersionId,
      createdByUserId: actorId,
    },
  });
}

function getLegsFromForm(formData: FormData, renditionId: string) {
  const departureLocations = getStringList(formData, "legDepartureLocation");
  const departureDates = getStringList(formData, "legDepartureDate");
  const departureTimes = getStringList(formData, "legDepartureTime");
  const departureKms = getStringList(formData, "legDepartureKm");
  const arrivalLocations = getStringList(formData, "legArrivalLocation");
  const arrivalDates = getStringList(formData, "legArrivalDate");
  const arrivalTimes = getStringList(formData, "legArrivalTime");
  const arrivalKms = getStringList(formData, "legArrivalKm");

  const totalLegs = Math.max(
    departureLocations.length,
    arrivalLocations.length,
    departureDates.length,
    arrivalDates.length
  );

  return Array.from({ length: totalLegs }, (_, index) => {
    const departureLocation = departureLocations[index] ?? "";
    const arrivalLocation = arrivalLocations[index] ?? "";
    const departureAt = parseDateTime(
      departureDates[index] ?? null,
      departureTimes[index] ?? null
    );
    const arrivalAt = parseDateTime(
      arrivalDates[index] ?? null,
      arrivalTimes[index] ?? null
    );
    const departureKm = parseNumber(departureKms[index]);
    const arrivalKm = parseNumber(arrivalKms[index]);

    const hasData =
      departureLocation ||
      arrivalLocation ||
      departureAt ||
      arrivalAt ||
      departureKm !== null ||
      arrivalKm !== null;

    if (!hasData || !departureLocation || !arrivalLocation) {
      return null;
    }

    return {
      renditionId,
      orderIndex: index + 1,
      departureLocation,
      arrivalLocation,
      departureAt: departureAt ?? undefined,
      arrivalAt: arrivalAt ?? undefined,
      departureKm: departureKm ?? undefined,
      arrivalKm: arrivalKm ?? undefined,
    };
  }).filter((leg): leg is NonNullable<typeof leg> => Boolean(leg));
}

export async function upsertRendition(formData: FormData) {
  const requestWorkerId = formData.get("requestWorkerId");
  const requestVersionId = formData.get("requestVersionId");
  const workerId = formData.get("workerId");
  if (
    typeof requestWorkerId !== "string" ||
    typeof requestVersionId !== "string" ||
    typeof workerId !== "string"
  ) {
    return;
  }

  const actor = await getAdminActor();
  if (!actor) {
    return;
  }

  const fields = getRenditionFields(formData);
  const requestWorker =
    fields.consumedViaticos !== null
      ? await prisma.viaticRequestWorker.findUnique({
          where: { id: requestWorkerId },
          select: {
            daysCount: true,
            dailyAmount: true,
            requestVersionId: true,
          },
        })
      : null;

  if (fields.consumedViaticos !== null) {
    if (!requestWorker) {
      return;
    }
    if (fields.consumedViaticos < 0 || !isHalfStep(fields.consumedViaticos)) {
      return;
    }
    if (Number(requestWorker.daysCount) < fields.consumedViaticos) {
      return;
    }
  }

  const rendition = await prisma.viaticRendition.upsert({
    where: { requestWorkerId },
    update: {
      reason: fields.reason,
      vehiclePlate: fields.vehiclePlate,
      attachmentUrl: fields.attachmentUrl,
      notes: fields.notes,
      consumedViaticos:
        fields.consumedViaticos === null
          ? null
          : new Prisma.Decimal(fields.consumedViaticos),
    },
    create: {
      requestWorkerId,
      requestVersionId,
      workerId,
      reason: fields.reason,
      vehiclePlate: fields.vehiclePlate,
      attachmentUrl: fields.attachmentUrl,
      notes: fields.notes,
      consumedViaticos:
        fields.consumedViaticos === null
          ? null
          : new Prisma.Decimal(fields.consumedViaticos),
      createdByUserId: actor.id,
    },
  });

  const legs = getLegsFromForm(formData, rendition.id);

  await prisma.viaticRenditionLeg.deleteMany({
    where: { renditionId: rendition.id },
  });

  if (legs.length > 0) {
    await prisma.viaticRenditionLeg.createMany({ data: legs });
  }

  if (requestWorker) {
    await upsertRenditionBalance({
      requestWorkerId,
      requestVersionId: requestWorker.requestVersionId,
      workerId,
      dailyAmount: requestWorker.dailyAmount,
      availableDays: Number(requestWorker.daysCount),
      consumedViaticos: fields.consumedViaticos,
      actorId: actor.id,
    });
  }

  await prisma.auditLog.create({
    data: {
      entity: "viatic_rendition",
      entityId: rendition.id,
      action: "upsert_rendition",
      afterJson: { requestWorkerId, legs: legs.length },
      userId: actor.id,
    },
  });

  revalidatePath("/administracion");
  revalidatePath("/colaboradores");
}

export async function upsertRenditionBulk(
  _prevState: RenditionActionState,
  formData: FormData
): Promise<RenditionActionState> {
  const requestWorkerIds = formData
    .getAll("requestWorkerIds")
    .filter((id): id is string => typeof id === "string" && id.trim() !== "");

  if (requestWorkerIds.length === 0) {
    return {
      status: "error",
      message: "Selecciona al menos un colaborador.",
    };
  }

  const actor = await getAdminActor();
  if (!actor) {
    return {
      status: "error",
      message: "No se encontro un usuario administrador.",
    };
  }

  const requestWorkers = await prisma.viaticRequestWorker.findMany({
    where: { id: { in: requestWorkerIds } },
    select: {
      id: true,
      workerId: true,
      requestVersionId: true,
      daysCount: true,
      dailyAmount: true,
    },
  });

  if (requestWorkers.length === 0) {
    return {
      status: "error",
      message: "No se encontraron colaboradores para rendir.",
    };
  }

  const fields = getRenditionFields(formData);

  const consumed = fields.consumedViaticos;
  if (consumed !== null) {
    if (consumed < 0 || !isHalfStep(consumed)) {
      return {
        status: "error",
        message: "Los viaticos consumidos deben ser multiplos de 0,5.",
      };
    }
    const exceeds = requestWorkers.some(
      (worker) => Number(worker.daysCount) < consumed
    );
    if (exceeds) {
      return {
        status: "error",
        message: "Los viaticos consumidos no pueden superar lo disponible.",
      };
    }
  }

  const balanceCount =
    consumed !== null
      ? requestWorkers.filter(
          (worker) => Number(worker.daysCount) > consumed
        ).length
      : 0;

  for (const requestWorker of requestWorkers) {
    const rendition = await prisma.viaticRendition.upsert({
      where: { requestWorkerId: requestWorker.id },
      update: {
        reason: fields.reason,
        vehiclePlate: fields.vehiclePlate,
        attachmentUrl: fields.attachmentUrl,
        notes: fields.notes,
        consumedViaticos:
          fields.consumedViaticos === null
            ? null
            : new Prisma.Decimal(fields.consumedViaticos),
      },
      create: {
        requestWorkerId: requestWorker.id,
        requestVersionId: requestWorker.requestVersionId,
        workerId: requestWorker.workerId,
        reason: fields.reason,
        vehiclePlate: fields.vehiclePlate,
        attachmentUrl: fields.attachmentUrl,
        notes: fields.notes,
        consumedViaticos:
          fields.consumedViaticos === null
            ? null
            : new Prisma.Decimal(fields.consumedViaticos),
        createdByUserId: actor.id,
      },
    });

    const legs = getLegsFromForm(formData, rendition.id);

    await prisma.viaticRenditionLeg.deleteMany({
      where: { renditionId: rendition.id },
    });

    if (legs.length > 0) {
      await prisma.viaticRenditionLeg.createMany({ data: legs });
    }

    await upsertRenditionBalance({
      requestWorkerId: requestWorker.id,
      requestVersionId: requestWorker.requestVersionId,
      workerId: requestWorker.workerId,
      dailyAmount: requestWorker.dailyAmount,
      availableDays: Number(requestWorker.daysCount),
      consumedViaticos: fields.consumedViaticos,
      actorId: actor.id,
    });

    await prisma.auditLog.create({
      data: {
        entity: "viatic_rendition",
        entityId: rendition.id,
        action: "upsert_rendition_bulk",
        afterJson: { requestWorkerId: requestWorker.id, legs: legs.length },
        userId: actor.id,
      },
    });
  }

  revalidatePath("/administracion");
  revalidatePath("/colaboradores");

  return {
    status: "success",
    message: "Rendicion generada.",
    balanceCount,
  };
}
