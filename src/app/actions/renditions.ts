"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

  return {
    reason: typeof reason === "string" ? reason : null,
    vehiclePlate: typeof vehiclePlate === "string" ? vehiclePlate : null,
    attachmentUrl: typeof attachmentUrl === "string" ? attachmentUrl : null,
    notes: typeof notes === "string" ? notes : null,
  };
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

  const rendition = await prisma.viaticRendition.upsert({
    where: { requestWorkerId },
    update: {
      reason: fields.reason,
      vehiclePlate: fields.vehiclePlate,
      attachmentUrl: fields.attachmentUrl,
      notes: fields.notes,
    },
    create: {
      requestWorkerId,
      requestVersionId,
      workerId,
      reason: fields.reason,
      vehiclePlate: fields.vehiclePlate,
      attachmentUrl: fields.attachmentUrl,
      notes: fields.notes,
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
}

export async function upsertRenditionBulk(formData: FormData) {
  const requestWorkerIds = formData
    .getAll("requestWorkerIds")
    .filter((id): id is string => typeof id === "string" && id.trim() !== "");

  if (requestWorkerIds.length === 0) {
    return;
  }

  const actor = await getAdminActor();
  if (!actor) {
    return;
  }

  const requestWorkers = await prisma.viaticRequestWorker.findMany({
    where: { id: { in: requestWorkerIds } },
    select: { id: true, workerId: true, requestVersionId: true },
  });

  if (requestWorkers.length === 0) {
    return;
  }

  const fields = getRenditionFields(formData);

  for (const requestWorker of requestWorkers) {
    const rendition = await prisma.viaticRendition.upsert({
      where: { requestWorkerId: requestWorker.id },
      update: {
        reason: fields.reason,
        vehiclePlate: fields.vehiclePlate,
        attachmentUrl: fields.attachmentUrl,
        notes: fields.notes,
      },
      create: {
        requestWorkerId: requestWorker.id,
        requestVersionId: requestWorker.requestVersionId,
        workerId: requestWorker.workerId,
        reason: fields.reason,
        vehiclePlate: fields.vehiclePlate,
        attachmentUrl: fields.attachmentUrl,
        notes: fields.notes,
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
}
