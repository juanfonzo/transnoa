"use server";

import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getDemoRole } from "@/lib/demo-auth";
import {
  addDateOnlyDays,
  dateOnlyKey,
  diffDateOnlyDaysInclusive,
  parseDateOnly,
} from "@/lib/date-only";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/action-result";
import {
  buildDateKeys,
  STANDARDIZE_ALLOWED_STATUSES,
  validatePaymentEligibility,
  validatePaymentInput,
  validateStatus,
  validateVersionReadiness,
  type WorkflowIssue,
} from "@/lib/workflow-rules";

const DEFAULT_AREA = "Santiago del Estero";

type DayPlan = Record<
  string,
  { workerIds: string[]; concepts: string[] }
>;

function addDays(date: Date, days: number) {
  return addDateOnlyDays(date, days);
}

function getRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function issueToResult(issue: WorkflowIssue): ActionResult {
  return actionError(issue.code, issue.message, issue.field);
}

function parseDayPlan(value: FormDataEntryValue | null): DayPlan | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([date, plan]) => {
        const rawPlan =
          plan && typeof plan === "object" && !Array.isArray(plan)
            ? (plan as Record<string, unknown>)
            : {};
        const workerIds = Array.isArray(rawPlan.workerIds)
          ? rawPlan.workerIds.filter(
              (id): id is string => typeof id === "string" && id.trim() !== ""
            )
          : [];
        const concepts = Array.isArray(rawPlan.concepts)
          ? rawPlan.concepts
              .filter((concept): concept is string => typeof concept === "string")
              .map((concept) => concept.trim())
              .filter(Boolean)
          : [];

        return [date, { workerIds, concepts }];
      })
    );
  } catch {
    return null;
  }
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
  const calendarDays = 3;
  const startDate = addDays(new Date(), 0);
  const endDate = addDays(startDate, calendarDays - 1);

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

  const grossAmount = dailyAmount.mul(calendarDays);
  const workerData = workers.map((worker) => ({
    requestVersionId: version.id,
    workerId: worker.id,
    daysCount: calendarDays,
    dailyAmount,
    grossAmount,
    balanceAppliedAmount: new Prisma.Decimal(0),
    netAmount: grossAmount,
  }));

  if (workerData.length > 0) {
    await prisma.viaticRequestWorker.createMany({ data: workerData });
  }

  const concepts = Array.from({ length: calendarDays }, (_, index) => ({
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

export async function createRequestWizard(
  formData: FormData
): Promise<ActionResult> {
  const role = (await getDemoRole()) as UserRole;
  const actor = await getActor(role);
  if (!actor) {
    return actionError(
      "ACTOR_NOT_FOUND",
      "No se encontró un usuario habilitado para crear la solicitud."
    );
  }

  const areaId = String(formData.get("areaId") || actor.areaId || (await ensureAreaId()));
  const startDate = parseDateOnly(formData.get("startDate"));
  const endDate = parseDateOnly(formData.get("endDate"));
  if (!startDate || !endDate) {
    return actionError(
      "INVALID_INPUT",
      "Completa una fecha de inicio y una fecha de fin válidas.",
      "dates"
    );
  }
  if (endDate < startDate) {
    return actionError(
      "INVALID_INPUT",
      "La fecha de fin no puede ser anterior a la fecha de inicio.",
      "dates"
    );
  }

  const dayPlan = parseDayPlan(formData.get("dayPlan"));
  if (!dayPlan) {
    return actionError(
      "MISSING_CONCEPTS",
      "Define al menos un concepto para cada día del período.",
      "concepts"
    );
  }

  const workerIds = Array.from(
    new Set(
      formData
        .getAll("workerIds")
        .filter(
          (id): id is string => typeof id === "string" && id.trim() !== ""
        )
    )
  );
  if (workerIds.length === 0) {
    return actionError(
      "MISSING_WORKERS",
      "Selecciona al menos un trabajador.",
      "workerIds"
    );
  }

  const calendarDays = diffDateOnlyDaysInclusive(startDate, endDate);
  const expectedDateKeys = buildDateKeys(startDate, endDate);
  const missingConceptDates = expectedDateKeys.filter(
    (date) => !dayPlan[date] || dayPlan[date].concepts.length === 0
  );
  if (missingConceptDates.length > 0) {
    return actionError(
      "MISSING_CONCEPTS",
      `Agrega al menos un concepto en cada día. Faltan ${missingConceptDates.length} día(s).`,
      "concepts"
    );
  }

  const latestRate = await prisma.viaticRateHistory.findFirst({
    orderBy: { effectiveFrom: "desc" },
  });
  const dailyAmount = latestRate?.amount ?? new Prisma.Decimal(25000);
  const lastDayHalf = formData.get("lastDayHalf") === "1";
  const lastDayKey = dateOnlyKey(endDate);

  const selectedWorkers = await prisma.worker.findMany({
    where: { id: { in: workerIds } },
  });
  if (selectedWorkers.length !== workerIds.length) {
    return actionError(
      "MISSING_WORKERS",
      "Uno o más trabajadores seleccionados ya no están disponibles.",
      "workerIds"
    );
  }

  const hasDayPlan = Object.values(dayPlan).some(
    (value) => Array.isArray(value.workerIds) && value.workerIds.length > 0
  );
  const workerDayMap = new Map<string, number>();
  const lastDayWorkers = new Set<string>();

  if (hasDayPlan) {
    Object.entries(dayPlan).forEach(([dateKey, value]) => {
      const dayDate = parseDateOnly(dateKey);
      if (!dayDate) return;
      if (dayDate < startDate || dayDate > endDate) return;
      const workerList = Array.isArray(value.workerIds)
        ? value.workerIds.filter((id) => workerIds.includes(id))
        : [];
      const uniqueWorkers = Array.from(new Set(workerList));
      uniqueWorkers.forEach((workerId) => {
        workerDayMap.set(workerId, (workerDayMap.get(workerId) ?? 0) + 1);
        if (dateKey === lastDayKey) {
          lastDayWorkers.add(workerId);
        }
      });
    });
  }

  const workerData = selectedWorkers
    .map((worker) => {
      const baseDays = hasDayPlan
        ? workerDayMap.get(worker.id) ?? 0
        : calendarDays;
      if (hasDayPlan && baseDays <= 0) {
        return null;
      }
      const applyHalf =
        lastDayHalf && (!hasDayPlan || lastDayWorkers.has(worker.id));
      const viaticDays = applyHalf ? Math.max(0.5, baseDays - 0.5) : baseDays;
      const grossAmount = dailyAmount.mul(viaticDays);
      return {
        workerId: worker.id,
        daysCount: viaticDays,
        dailyAmount,
        grossAmount,
        balanceAppliedAmount: new Prisma.Decimal(0),
        netAmount: grossAmount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (workerData.length === 0) {
    return actionError(
      "MISSING_WORKERS",
      "Asigna al menos un día a alguno de los trabajadores seleccionados.",
      "workerIds"
    );
  }

  const requestNumber = await generateRequestNumber();
  await prisma.$transaction(async (tx) => {
    const request = await tx.viaticRequest.create({
      data: {
        requestNumber,
        areaId,
        createdByUserId: actor.id,
        status: "SUBMITTED_TO_ADMIN",
        currentVersionNumber: 1,
      },
    });

    const version = await tx.viaticRequestVersion.create({
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
          dayPlan,
          lastDayHalf,
        },
      },
    });

    await tx.viaticRequestWorker.createMany({
      data: workerData.map((worker) => ({
        ...worker,
        requestVersionId: version.id,
      })),
    });

    await tx.viaticRequestDayConcept.createMany({
      data: expectedDateKeys.flatMap((date) =>
        dayPlan[date].concepts.map((concept) => ({
          requestVersionId: version.id,
          date: parseDateOnly(date)!,
          conceptText: concept,
        }))
      ),
    });

    await tx.auditLog.create({
      data: {
        entity: "viatic_request",
        entityId: request.id,
        action: "create_request_wizard",
        afterJson: { status: request.status },
        userId: actor.id,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/solicitudes");
  revalidatePath("/administracion");
  return actionSuccess("La solicitud fue enviada a administración.");
}

export async function adminStandardize(
  formData: FormData
): Promise<ActionResult> {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return actionError("INVALID_INPUT", "No se pudo identificar la solicitud.");
  }

  const actor = await getActor("ADMIN");
  if (!actor) {
    return actionError(
      "ACTOR_NOT_FOUND",
      "No se encontró un usuario de administración habilitado."
    );
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
    return actionError("NOT_FOUND", "La solicitud ya no está disponible.");
  }

  const statusIssue = validateStatus(
    request.status,
    STANDARDIZE_ALLOWED_STATUSES,
    "La solicitud ya no está pendiente de revisión administrativa."
  );
  if (statusIssue) return issueToResult(statusIssue);

  const loteNumber = getRequiredText(formData, "loteNumber");
  const plannedPaymentDate = parseDateOnly(formData.get("plannedPaymentDate"));
  const readinessIssue = validateVersionReadiness({
    loteNumber,
    plannedPaymentDate,
    workerCount: version.workers.length,
    startDate: version.startDate,
    endDate: version.endDate,
    conceptDates: version.dayConcepts.map((concept) => concept.date),
  });
  if (readinessIssue) return issueToResult(readinessIssue);

  const notes = getRequiredText(formData, "notes");
  await prisma.$transaction([
    prisma.viaticRequestVersion.update({
      where: { id: version.id },
      data: {
        loteNumber,
        plannedPaymentDate,
        notes: notes || version.notes,
      },
    }),
    prisma.viaticRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_SIGNATURE" },
    }),
    prisma.auditLog.create({
      data: {
        entity: "viatic_request",
        entityId: request.id,
        action: "admin_standardize",
        afterJson: { status: "PENDING_SIGNATURE", loteNumber },
        userId: actor.id,
      },
    }),
  ]);

  revalidatePath("/administracion");
  revalidatePath("/solicitudes");
  return actionSuccess("La solicitud fue enviada a firma.");
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

  const plannedPaymentDate = parseDateOnly(formData.get("plannedPaymentDate"));
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

export async function signRequest(formData: FormData): Promise<ActionResult> {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return actionError("INVALID_INPUT", "No se pudo identificar la solicitud.");
  }

  const actor = await getActor("JEFE_AREA");
  if (!actor) {
    return actionError(
      "ACTOR_NOT_FOUND",
      "No se encontró un jefe de área habilitado para firmar."
    );
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
    return actionError("NOT_FOUND", "La solicitud ya no está disponible.");
  }

  const statusIssue = validateStatus(
    request.status,
    ["PENDING_SIGNATURE"],
    "La solicitud ya no está pendiente de firma."
  );
  if (statusIssue) return issueToResult(statusIssue);

  const readinessIssue = validateVersionReadiness({
    loteNumber: version.loteNumber,
    plannedPaymentDate: version.plannedPaymentDate,
    workerCount: version.workers.length,
    startDate: version.startDate,
    endDate: version.endDate,
    conceptDates: version.dayConcepts.map((concept) => concept.date),
  });
  if (readinessIssue) return issueToResult(readinessIssue);

  await prisma.$transaction([
    prisma.signature.upsert({
      where: { requestVersionId: version.id },
      update: { signedAt: new Date(), signedByUserId: actor.id },
      create: {
        requestVersionId: version.id,
        signedByUserId: actor.id,
        signatureMethod: "PIN",
        docHash: "demo-hash",
      },
    }),
    prisma.viaticRequest.update({
      where: { id: request.id },
      data: { status: "READY_FOR_PAYMENT" },
    }),
    prisma.auditLog.create({
      data: {
        entity: "viatic_request",
        entityId: request.id,
        action: "sign_request",
        afterJson: { status: "READY_FOR_PAYMENT" },
        userId: actor.id,
      },
    }),
  ]);

  revalidatePath("/solicitudes");
  revalidatePath("/tesoreria");
  revalidatePath("/administracion");
  return actionSuccess("La solicitud fue firmada y quedó lista para pago.");
}

async function savePayment(
  formData: FormData,
  actorRole: "ADMIN" | "TESORERIA"
): Promise<ActionResult> {
  const requestId = formData.get("requestId");
  const paidAtValue = parseDateOnly(formData.get("paidAt"));
  const paymentReference = getRequiredText(formData, "paymentReference");
  const notes = getRequiredText(formData, "notes");
  if (typeof requestId !== "string") {
    return actionError("INVALID_INPUT", "No se pudo identificar la solicitud.");
  }
  const paymentInputIssue = validatePaymentInput({
    paidAt: paidAtValue,
    paymentReference,
  });
  if (paymentInputIssue) return issueToResult(paymentInputIssue);

  const actor = await getActor(actorRole);
  if (!actor) {
    return actionError(
      "ACTOR_NOT_FOUND",
      "No se encontró un usuario habilitado para registrar el pago."
    );
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          workers: true,
          dayConcepts: true,
          signature: true,
          payment: true,
        },
      },
    },
  });

  const version = request?.versions[0];
  if (!request || !version) {
    return actionError("NOT_FOUND", "La solicitud ya no está disponible.");
  }

  const eligibilityIssue = validatePaymentEligibility({
    status: request.status,
    hasPayment: Boolean(version.payment),
    hasSignature: Boolean(version.signature),
  });
  if (eligibilityIssue) return issueToResult(eligibilityIssue);

  const readinessIssue = validateVersionReadiness({
    loteNumber: version.loteNumber,
    plannedPaymentDate: version.plannedPaymentDate,
    workerCount: version.workers.length,
    startDate: version.startDate,
    endDate: version.endDate,
    conceptDates: version.dayConcepts.map((concept) => concept.date),
  });
  if (readinessIssue) return issueToResult(readinessIssue);

  const isUpdate = Boolean(version.payment);
  const auditAction = isUpdate
    ? actorRole === "ADMIN"
      ? "admin_update_payment"
      : "update_payment"
    : actorRole === "ADMIN"
      ? "admin_mark_paid"
      : "mark_paid";

  await prisma.$transaction([
    prisma.viaticRequest.update({
      where: { id: requestId },
      data: { status: "PAID" },
    }),
    prisma.treasuryPayment.upsert({
      where: { requestVersionId: version.id },
      update: {
        paidAt: paidAtValue!,
        paymentReference,
        ...(notes ? { notes } : {}),
      },
      create: {
        requestVersionId: version.id,
        paidAt: paidAtValue!,
        paymentReference,
        notes: notes || `Pago registrado desde ${actorRole.toLowerCase()}`,
        createdByUserId: actor.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        entity: "viatic_request",
        entityId: request.id,
        action: auditAction,
        afterJson: {
          status: "PAID",
          operation: isUpdate ? "update" : "create",
        },
        userId: actor.id,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/tesoreria");
  revalidatePath("/solicitudes");
  revalidatePath("/administracion");
  return actionSuccess(isUpdate ? "El pago fue actualizado." : "El pago fue registrado.");
}

export async function markPaid(formData: FormData): Promise<ActionResult> {
  return savePayment(formData, "TESORERIA");
}

export async function adminMarkPaid(formData: FormData): Promise<ActionResult> {
  return savePayment(formData, "ADMIN");
}

export async function adminUpdateLote(
  formData: FormData
): Promise<ActionResult> {
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string") {
    return actionError("INVALID_INPUT", "No se pudo identificar la solicitud.");
  }

  const actor = await getActor("ADMIN");
  if (!actor) {
    return actionError(
      "ACTOR_NOT_FOUND",
      "No se encontró un usuario de administración habilitado."
    );
  }

  const request = await prisma.viaticRequest.findUnique({
    where: { id: requestId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { payment: true, signature: true },
      },
    },
  });
  const version = request?.versions[0];
  if (!request || !version) {
    return actionError("NOT_FOUND", "La solicitud ya no está disponible.");
  }

  if (request.status === "PAID" || version.payment) {
    return actionError(
      "INVALID_STATUS",
      "El lote de una solicitud pagada no se puede modificar."
    );
  }

  const plannedPaymentDate = parseDateOnly(formData.get("plannedPaymentDate"));
  const loteRaw = getRequiredText(formData, "loteNumber");
  if (!loteRaw) {
    return actionError(
      "MISSING_LOTE",
      "Ingresa el lote corregido.",
      "loteNumber"
    );
  }
  if (!plannedPaymentDate) {
    return actionError(
      "MISSING_PLANNED_PAYMENT_DATE",
      "Indica la fecha prevista de pago corregida.",
      "plannedPaymentDate"
    );
  }
  const notesRaw = formData.get("notes");

  await prisma.$transaction([
    prisma.viaticRequestVersion.update({
      where: { id: version.id },
      data: {
        loteNumber: loteRaw,
        plannedPaymentDate,
        notes:
          typeof notesRaw === "string" && notesRaw.trim() !== ""
            ? notesRaw
            : version.notes,
      },
    }),
    prisma.signature.deleteMany({
      where: { requestVersionId: version.id },
    }),
    prisma.viaticRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_SIGNATURE" },
    }),
    prisma.auditLog.create({
      data: {
        entity: "viatic_request_version",
        entityId: version.id,
        action: "admin_update_lote",
        afterJson: {
          loteNumber: loteRaw,
          plannedPaymentDate: plannedPaymentDate.toISOString(),
          status: "PENDING_SIGNATURE",
        },
        userId: actor.id,
      },
    }),
  ]);

  revalidatePath("/administracion");
  revalidatePath("/solicitudes");
  return actionSuccess("El lote fue corregido y requiere una nueva firma.");
}

export async function requestCorrection(formData: FormData) {
  const requestId = formData.get("requestId");
  const reason = formData.get("reason");
  const suggestedDate = parseDateOnly(formData.get("suggestedPaymentDate"));
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

