"use server";

import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDemoRole } from "@/lib/demo-auth";

const DEFAULT_AREA = "Santiago del Estero";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function diffDaysInclusive(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

async function ensureAreaId() {
  const area = await prisma.area.upsert({
    where: { name: DEFAULT_AREA },
    update: {},
    create: { name: DEFAULT_AREA },
  });
  return area.id;
}

async function getActor(role: UserRole) {
  const user = await prisma.user.findFirst({ where: { role } });
  if (user) {
    return user;
  }

  return prisma.user.findFirst({ where: { role: "ADMIN" } });
}

async function generateRequestNumber() {
  const latest = await prisma.viaticRequest.findFirst({
    orderBy: { createdAt: "desc" },
    select: { requestNumber: true },
  });

  const match = latest?.requestNumber.match(/REQ-(\d+)/);
  if (match) {
    const next = Number(match[1]) + 1;
    return `REQ-${String(next).padStart(4, "0")}`;
  }

  return `REQ-${Date.now()}`;
}

export async function createDemoRequest() {
  const role = (await getDemoRole()) as UserRole;
  const actor = await getActor(role);
  if (!actor) {
    return;
  }

  const areaId = actor.areaId ?? (await ensureAreaId());
  const requestNumber = await generateRequestNumber();
  const latestRate = await prisma.viaticRateHistory.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });

  const dailyAmount = latestRate?.amount ?? new Prisma.Decimal(25000);
  const daysCount = 3;
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = addDays(startDate, daysCount - 1);

  const request = await prisma.viaticRequest.create({
    data: {
      requestNumber,
      areaId,
      createdByUserId: actor.id,
      status: "SUBMITTED_TO_ADMIN",
      currentVersionNumber: 1,
    },
  });

  const version = await prisma.viaticRequestVersion.create({
    data: {
      requestId: request.id,
      versionNumber: 1,
      startDate,
      endDate,
      createdByUserId: actor.id,
      notes: "Solicitud creada desde demo",
    },
  });

  const workers = await prisma.worker.findMany({
    take: 3,
    orderBy: { name: "asc" },
  });

  const grossAmount = dailyAmount.mul(daysCount);
  const workerData = workers.map((worker) => ({
    requestVersionId: version.id,
    workerId: worker.id,
    daysCount,
    dailyAmount,
    grossAmount,
    balanceAppliedAmount: new Prisma.Decimal(0),
    netAmount: grossAmount,
  }));

  if (workerData.length > 0) {
    await prisma.viaticRequestWorker.createMany({ data: workerData });
  }

  const concepts = Array.from({ length: daysCount }, (_, index) => ({
    requestVersionId: version.id,
    date: addDays(startDate, index),
    conceptText: index === 0 ? "Montaje" : "Trabajo operativo",
  }));

  await prisma.viaticRequestDayConcept.createMany({ data: concepts });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "create_demo_request",
      afterJson: { status: request.status },
      userId: actor.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/solicitudes");
  revalidatePath("/administracion");
}

export async function createRequestWizard(formData: FormData) {
  const role = (await getDemoRole()) as UserRole;
  const actor = await getActor(role);
  if (!actor) {
    return;
  }

  const areaId = String(formData.get("areaId") || actor.areaId || (await ensureAreaId()));
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));
  if (!startDate || !endDate) {
    return;
  }
  if (endDate < startDate) {
    return;
  }

  const conceptLines = String(formData.get("concepts") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let dayPlan: Record<string, { workerIds?: string[]; concepts?: string[] }> = {};
  const dayPlanRaw = formData.get("dayPlan");
  if (typeof dayPlanRaw === "string" && dayPlanRaw.trim() !== "") {
    try {
      dayPlan = JSON.parse(dayPlanRaw);
    } catch {
      dayPlan = {};
    }
  }

  const workerIds = formData
    .getAll("workerIds")
    .filter((id): id is string => typeof id === "string");
  if (workerIds.length === 0) {
    return;
  }

  const daysCount = diffDaysInclusive(startDate, endDate);
  const latestRate = await prisma.viaticRateHistory.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });
  const dailyAmount = latestRate?.amount ?? new Prisma.Decimal(25000);

  const requestNumber = await generateRequestNumber();
  const request = await prisma.viaticRequest.create({
    data: {
      requestNumber,
      areaId,
      createdByUserId: actor.id,
      status: "SUBMITTED_TO_ADMIN",
      currentVersionNumber: 1,
    },
  });

  const version = await prisma.viaticRequestVersion.create({
    data: {
      requestId: request.id,
      versionNumber: 1,
      startDate,
      endDate,
      createdByUserId: actor.id,
      notes: "Solicitud cargada desde wizard",
      payloadJson: {
        crew: String(formData.get("crew") || ""),
        location: String(formData.get("location") || ""),
        concepts: conceptLines,
        dayPlan,
      },
    },
  });

  const selectedWorkers = await prisma.worker.findMany({
    where: { id: { in: workerIds } },
  });

  const hasDayPlan = Object.keys(dayPlan).length > 0;
  const workerDayMap = new Map<string, number>();

  if (hasDayPlan) {
    Object.entries(dayPlan).forEach(([dateKey, value]) => {
      const dayDate = parseDate(dateKey);
      if (!dayDate) return;
      if (dayDate < startDate || dayDate > endDate) return;
      const workerList = Array.isArray(value.workerIds)
        ? value.workerIds.filter((id) => workerIds.includes(id))
        : [];
      const uniqueWorkers = Array.from(new Set(workerList));
      uniqueWorkers.forEach((workerId) => {
        workerDayMap.set(workerId, (workerDayMap.get(workerId) ?? 0) + 1);
      });
    });
  }

  const workerData = selectedWorkers
    .map((worker) => {
      const parsedDays = hasDayPlan
        ? workerDayMap.get(worker.id) ?? 0
        : daysCount;
      if (hasDayPlan && parsedDays <= 0) {
        return null;
      }
      const grossAmount = dailyAmount.mul(parsedDays);
      return {
        requestVersionId: version.id,
        workerId: worker.id,
        daysCount: parsedDays,
        dailyAmount,
        grossAmount,
        balanceAppliedAmount: new Prisma.Decimal(0),
        netAmount: grossAmount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (workerData.length > 0) {
    await prisma.viaticRequestWorker.createMany({ data: workerData });
  }

  if (hasDayPlan) {
    const dayConcepts = Object.entries(dayPlan)
      .map(([dateKey, value]) => {
        const dayDate = parseDate(dateKey);
        if (!dayDate) return [];
        if (dayDate < startDate || dayDate > endDate) return [];
        const concepts =
          Array.isArray(value.concepts) && value.concepts.length > 0
            ? value.concepts
            : ["Concepto general"];
        return concepts.map((concept) => ({
          requestVersionId: version.id,
          date: dayDate,
          conceptText: String(concept),
        }));
      })
      .flat();

    if (dayConcepts.length > 0) {
      await prisma.viaticRequestDayConcept.createMany({ data: dayConcepts });
    }
  } else {
    const concepts =
      conceptLines.length > 0 ? conceptLines : ["Concepto general"];
    const dayConcepts = Array.from({ length: daysCount }, (_, index) =>
      concepts.map((concept) => ({
        requestVersionId: version.id,
        date: addDays(startDate, index),
        conceptText: concept,
      }))
    ).flat();
    await prisma.viaticRequestDayConcept.createMany({ data: dayConcepts });
  }

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "create_request_wizard",
      afterJson: { status: request.status },
      userId: actor.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/solicitudes");
  revalidatePath("/administracion");
}

export async function adminStandardize(formData: FormData) {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return;
  }

  const actor = await getActor("ADMIN");
  if (!actor) {
    return;
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  const version = request?.versions[0];
  if (!request || !version) {
    return;
  }

  const plannedPaymentDate = parseDate(formData.get("plannedPaymentDate"));
  await prisma.viaticRequestVersion.update({
    where: { id: version.id },
    data: {
      loteNumber: String(formData.get("loteNumber") || version.loteNumber || ""),
      plannedPaymentDate: plannedPaymentDate ?? version.plannedPaymentDate,
      notes: String(formData.get("notes") || version.notes || ""),
    },
  });

  await prisma.viaticRequest.update({
    where: { id: request.id },
    data: { status: "PENDING_SIGNATURE" },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "admin_standardize",
      afterJson: { status: "PENDING_SIGNATURE" },
      userId: actor.id,
    },
  });

  revalidatePath("/administracion");
  revalidatePath("/solicitudes");
}

export async function adminCreateCorrection(formData: FormData) {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return;
  }

  const actor = await getActor("ADMIN");
  if (!actor) {
    return;
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { workers: true, dayConcepts: true },
      },
    },
  });
  const version = request?.versions[0];
  if (!request || !version) {
    return;
  }

  const plannedPaymentDate = parseDate(formData.get("plannedPaymentDate"));
  const newVersionNumber = version.versionNumber + 1;

  const newVersion = await prisma.viaticRequestVersion.create({
    data: {
      requestId: request.id,
      versionNumber: newVersionNumber,
      startDate: version.startDate,
      endDate: version.endDate,
      plannedPaymentDate: plannedPaymentDate ?? version.plannedPaymentDate,
      loteNumber: String(formData.get("loteNumber") || version.loteNumber || ""),
      notes: String(formData.get("notes") || "Correccion solicitada"),
      createdByUserId: actor.id,
    },
  });

  if (version.workers.length > 0) {
    await prisma.viaticRequestWorker.createMany({
      data: version.workers.map((worker) => ({
        requestVersionId: newVersion.id,
        workerId: worker.workerId,
        daysCount: worker.daysCount,
        dailyAmount: worker.dailyAmount,
        grossAmount: worker.grossAmount,
        balanceAppliedAmount: worker.balanceAppliedAmount,
        netAmount: worker.netAmount,
      })),
    });
  }

  if (version.dayConcepts.length > 0) {
    await prisma.viaticRequestDayConcept.createMany({
      data: version.dayConcepts.map((concept) => ({
        requestVersionId: newVersion.id,
        date: concept.date,
        conceptText: concept.conceptText,
        conceptCode: concept.conceptCode ?? undefined,
      })),
    });
  }

  await prisma.correctionRequest.updateMany({
    where: { requestVersionId: version.id, status: "OPEN" },
    data: { status: "RESOLVED" },
  });

  await prisma.viaticRequest.update({
    where: { id: request.id },
    data: {
      status: "PENDING_SIGNATURE",
      currentVersionNumber: newVersionNumber,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "admin_create_correction",
      afterJson: { status: "PENDING_SIGNATURE" },
      userId: actor.id,
    },
  });

  revalidatePath("/administracion");
  revalidatePath("/solicitudes");
}

export async function signRequest(formData: FormData) {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return;
  }

  const actor = await getActor("JEFE_AREA");
  if (!actor) {
    return;
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  const version = request?.versions[0];
  if (!request || !version) {
    return;
  }

  await prisma.signature.upsert({
    where: { requestVersionId: version.id },
    update: { signedAt: new Date() },
    create: {
      requestVersionId: version.id,
      signedByUserId: actor.id,
      signatureMethod: "PIN",
      docHash: "demo-hash",
    },
  });

  await prisma.viaticRequest.update({
    where: { id: request.id },
    data: { status: "READY_FOR_PAYMENT" },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "sign_request",
      afterJson: { status: "READY_FOR_PAYMENT" },
      userId: actor.id,
    },
  });

  revalidatePath("/solicitudes");
  revalidatePath("/tesoreria");
}

export async function markPaid(formData: FormData) {
  const requestId = formData.get("requestId");
  const paidAtValue = parseDate(formData.get("paidAt"));
  const paymentReference = formData.get("paymentReference");
  const notes = formData.get("notes");
  if (typeof requestId !== "string") {
    return;
  }

  const actor = await getActor("TESORERIA");
  if (!actor) {
    return;
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  const version = request?.versions[0];
  if (!request || !version) {
    return;
  }

  await prisma.viaticRequest.update({
    where: { id: requestId },
    data: { status: "PAID" },
  });

  await prisma.treasuryPayment.upsert({
    where: { requestVersionId: version.id },
    update: {
      paidAt: paidAtValue ?? new Date(),
      paymentReference:
        typeof paymentReference === "string" && paymentReference.trim() !== ""
          ? paymentReference
          : "DEP-DEMO",
      notes: typeof notes === "string" ? notes : "Pago registrado desde demo",
    },
    create: {
      requestVersionId: version.id,
      paidAt: paidAtValue ?? new Date(),
      paymentReference:
        typeof paymentReference === "string" && paymentReference.trim() !== ""
          ? paymentReference
          : "DEP-DEMO",
      notes: typeof notes === "string" ? notes : "Pago registrado desde demo",
      createdByUserId: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "mark_paid",
      afterJson: { status: "PAID" },
      userId: actor.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/tesoreria");
  revalidatePath("/solicitudes");
}

export async function requestCorrection(formData: FormData) {
  const requestId = formData.get("requestId");
  const reason = formData.get("reason");
  const suggestedDate = parseDate(formData.get("suggestedPaymentDate"));
  if (typeof requestId !== "string") {
    return;
  }

  const actor = await getActor("TESORERIA");
  if (!actor) {
    return;
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  const version = request?.versions[0];
  if (!request || !version) {
    return;
  }

  await prisma.viaticRequest.update({
    where: { id: requestId },
    data: { status: "TREASURY_RETURNED" },
  });

  await prisma.correctionRequest.create({
    data: {
      requestVersionId: version.id,
      requestedByUserId: actor.id,
      reason:
        typeof reason === "string" && reason.trim() !== ""
          ? reason
          : "Banco no habil",
      suggestedPaymentDate: suggestedDate ?? addDays(new Date(), 2),
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "request_correction",
      afterJson: { status: "TREASURY_RETURNED" },
      userId: actor.id,
    },
  });

  revalidatePath("/administracion");
  revalidatePath("/tesoreria");
  revalidatePath("/solicitudes");
}

