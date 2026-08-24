const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SHOWCASE_REQUEST_NUMBERS = [
  "REQ-1001",
  "REQ-1002",
  "REQ-1003",
  "REQ-1004",
  "REQ-1005",
  "REQ-1006",
  "REQ-1007",
];
const LEGACY_QA_REQUEST_NUMBERS = ["REQ-0001", "REQ-0002", "REQ-0003"];
const RESETTABLE_REQUEST_NUMBERS = [
  ...LEGACY_QA_REQUEST_NUMBERS,
  ...SHOWCASE_REQUEST_NUMBERS,
];
const SHOWCASE_RETROACTIVE_PERIOD = "2026-08-DEMO";
const SHOWCASE_RATE_NOTE = "Monto vigente - demo comercial";

function date(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function timestamp(value) {
  return new Date(`${value}T12:00:00.000Z`);
}

function dateKeys(startDate, days) {
  return Array.from({ length: days }, (_, index) => {
    const current = new Date(startDate);
    current.setUTCDate(current.getUTCDate() + index);
    return current;
  });
}

async function cleanupShowcaseData() {
  const requests = await prisma.viaticRequest.findMany({
    where: { requestNumber: { in: RESETTABLE_REQUEST_NUMBERS } },
    select: {
      id: true,
      versions: {
        select: {
          id: true,
          payment: { select: { id: true } },
          renditions: { select: { id: true } },
        },
      },
    },
  });
  const requestIds = requests.map((request) => request.id);
  const versions = requests.flatMap((request) => request.versions);
  const versionIds = versions.map((version) => version.id);
  const paymentIds = versions.flatMap((version) =>
    version.payment ? [version.payment.id] : []
  );
  const renditionIds = versions.flatMap((version) =>
    version.renditions.map((rendition) => rendition.id)
  );
  const retroactiveBatches = await prisma.retroactiveAdjustmentBatch.findMany({
    where: { periodMonth: SHOWCASE_RETROACTIVE_PERIOD },
    select: { id: true },
  });
  const batchIds = retroactiveBatches.map((batch) => batch.id);

  const tx = prisma;
    if (batchIds.length > 0) {
      await tx.retroactiveAdjustmentItem.deleteMany({
        where: { batchId: { in: batchIds } },
      });
      await tx.retroactiveAdjustmentBatch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }
    if (paymentIds.length > 0) {
      await tx.retroactiveAdjustmentItem.deleteMany({
        where: { relatedPaymentId: { in: paymentIds } },
      });
    }
    if (renditionIds.length > 0) {
      await tx.viaticRenditionLeg.deleteMany({
        where: { renditionId: { in: renditionIds } },
      });
    }
    if (versionIds.length > 0) {
      await tx.viaticRendition.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.workerViaticBalanceLedger.deleteMany({
        where: { relatedRequestVersionId: { in: versionIds } },
      });
      await tx.correctionRequest.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.treasuryPayment.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.signature.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.viaticRequestDayConcept.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.viaticRequestWorker.deleteMany({
        where: { requestVersionId: { in: versionIds } },
      });
      await tx.auditLog.deleteMany({
        where: { entityId: { in: [...requestIds, ...versionIds] } },
      });
      await tx.viaticRequestVersion.deleteMany({
        where: { id: { in: versionIds } },
      });
    }
    if (requestIds.length > 0) {
      await tx.viaticRequest.deleteMany({ where: { id: { in: requestIds } } });
    }
    await tx.viaticRateHistory.deleteMany({ where: { note: SHOWCASE_RATE_NOTE } });
}

async function createShowcaseRequest({
  requestNumber,
  status,
  createdAt,
  start,
  days,
  loteNumber,
  plannedPaymentDate,
  workerIndexes,
  area,
  jefe,
  admin,
  tesoreria,
  workers,
  dailyAmount,
  signed = false,
  signedAt = null,
  paidAt = null,
  paymentReference = null,
  correction = null,
  renditionComplete = false,
}) {
  const request = await prisma.viaticRequest.create({
    data: {
      requestNumber,
      areaId: area.id,
      createdByUserId: jefe.id,
      status,
      currentVersionNumber: 1,
      createdAt: timestamp(createdAt ?? start),
    },
  });
  const startDate = date(start);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + days - 1);
  const version = await prisma.viaticRequestVersion.create({
    data: {
      requestId: request.id,
      versionNumber: 1,
      startDate,
      endDate,
      plannedPaymentDate: plannedPaymentDate ? date(plannedPaymentDate) : null,
      loteNumber: loteNumber ?? null,
      notes: `Escenario comercial ${requestNumber}`,
      payloadJson: {
        crew: `Cuadrilla ${requestNumber.slice(-2)}`,
        location: "Santiago del Estero",
      },
      createdByUserId: status === "SUBMITTED_TO_ADMIN" ? jefe.id : admin.id,
      createdAt: timestamp(createdAt ?? start),
    },
  });
  const selectedWorkers = workerIndexes.map((index) => workers[index]);
  const requestWorkers = [];

  for (const worker of selectedWorkers) {
    const grossAmount = dailyAmount * days;
    const requestWorker = await prisma.viaticRequestWorker.create({
      data: {
        requestVersionId: version.id,
        workerId: worker.id,
        daysCount: days,
        dailyAmount,
        grossAmount,
        balanceAppliedAmount: 0,
        netAmount: grossAmount,
      },
    });
    requestWorkers.push({ requestWorker, worker });
  }

  await prisma.viaticRequestDayConcept.createMany({
    data: dateKeys(startDate, days).map((conceptDate, index) => ({
      requestVersionId: version.id,
      date: conceptDate,
      conceptText:
        index === 0
          ? "Traslado y preparación de tareas"
          : index === days - 1
            ? "Cierre operativo y regreso"
            : "Mantenimiento programado",
    })),
  });

  if (signed) {
    await prisma.signature.create({
      data: {
        requestVersionId: version.id,
        signedByUserId: jefe.id,
        signatureMethod: "PIN_DEMO",
        docHash: `demo-${requestNumber.toLowerCase()}`,
        signedAt: timestamp(signedAt ?? plannedPaymentDate ?? start),
      },
    });
  }

  let payment = null;
  if (paidAt) {
    payment = await prisma.treasuryPayment.create({
      data: {
        requestVersionId: version.id,
        paidAt: date(paidAt),
        paymentReference,
        notes: "Pago confirmado por Tesorería",
        createdByUserId: tesoreria.id,
        createdAt: timestamp(paidAt),
      },
    });
  }

  if (correction) {
    await prisma.correctionRequest.create({
      data: {
        requestVersionId: version.id,
        requestedByUserId: tesoreria.id,
        reason: correction.reason,
        suggestedPaymentDate: date(correction.suggestedPaymentDate),
        requestedAt: correction.requestedAt
          ? timestamp(correction.requestedAt)
          : new Date(),
        status: "OPEN",
      },
    });
  }

  if (renditionComplete) {
    for (const [index, entry] of requestWorkers.entries()) {
      const rendition = await prisma.viaticRendition.create({
        data: {
          requestWorkerId: entry.requestWorker.id,
          requestVersionId: version.id,
          workerId: entry.worker.id,
          consumedViaticos: days,
          reason: "Trabajo programado completado",
          vehiclePlate: `AE${100 + index}TN`,
          attachmentUrl: `https://demo.transnoa.local/rendiciones/${requestNumber}-${entry.worker.legajo}`,
          notes: "Rendición completa de demostración",
          createdByUserId: admin.id,
        },
      });
      await prisma.viaticRenditionLeg.create({
        data: {
          renditionId: rendition.id,
          orderIndex: 1,
          departureLocation: "Base Santiago del Estero",
          departureAt: date(start),
          departureKm: 125000 + index * 100,
          arrivalLocation: "Base Santiago del Estero",
          arrivalAt: endDate,
          arrivalKm: 125420 + index * 100,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "seed_showcase_scenario",
      afterJson: { status, requestNumber },
      userId:
        status === "PAID"
          ? tesoreria.id
          : status === "READY_FOR_PAYMENT" || status === "TREASURY_RETURNED"
            ? jefe.id
            : admin.id,
    },
  });

  return { request, version, payment, requestWorkers };
}

async function main() {
  const area = await prisma.area.upsert({
    where: { name: "Santiago del Estero" },
    update: {},
    create: { name: "Santiago del Estero" },
  });

  const [jefe, admin, tesoreria, colaborador] = await Promise.all([
    prisma.user.upsert({
      where: { email: "jefe.area@transnoa.demo" },
      update: { name: "Jefe de Área", role: "JEFE_AREA", areaId: area.id },
      create: {
        name: "Jefe de Área",
        email: "jefe.area@transnoa.demo",
        role: "JEFE_AREA",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@transnoa.demo" },
      update: { name: "Administración", role: "ADMIN", areaId: area.id },
      create: {
        name: "Administración",
        email: "admin@transnoa.demo",
        role: "ADMIN",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "tesoreria@transnoa.demo" },
      update: { name: "Tesorería", role: "TESORERIA", areaId: area.id },
      create: {
        name: "Tesorería",
        email: "tesoreria@transnoa.demo",
        role: "TESORERIA",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "colaborador@transnoa.demo" },
      update: { name: "Carlos Ruiz", role: "COLABORADOR", areaId: area.id },
      create: {
        name: "Carlos Ruiz",
        email: "colaborador@transnoa.demo",
        role: "COLABORADOR",
        areaId: area.id,
      },
    }),
  ]);

  const workers = await Promise.all([
    prisma.worker.upsert({
      where: { legajo: "1001" },
      update: { name: "Carlos Ruiz", status: "Activo" },
      create: {
        legajo: "1001",
        name: "Carlos Ruiz",
        dni: "30123456",
        cbu: "0000000000000000000001",
        bank: "Banco Demo",
        province: "Santiago del Estero",
        status: "Activo",
      },
    }),
    prisma.worker.upsert({
      where: { legajo: "1002" },
      update: { name: "Lucía Gómez", status: "Activo" },
      create: {
        legajo: "1002",
        name: "Lucía Gómez",
        dni: "30987654",
        cbu: "0000000000000000000002",
        bank: "Banco Demo",
        province: "Santiago del Estero",
        status: "Activo",
      },
    }),
    prisma.worker.upsert({
      where: { legajo: "1003" },
      update: { name: "Miguel Pérez", status: "Activo" },
      create: {
        legajo: "1003",
        name: "Miguel Pérez",
        dni: "30111111",
        cbu: "0000000000000000000003",
        bank: "Banco Demo",
        province: "Santiago del Estero",
        status: "Activo",
      },
    }),
  ]);

  await cleanupShowcaseData();

  const dailyAmount = 28000;
  await prisma.viaticRateHistory.create({
    data: {
      effectiveFrom: date("2026-08-01"),
      amount: dailyAmount,
      note: SHOWCASE_RATE_NOTE,
      createdById: admin.id,
    },
  });

  const scenarios = [
    {
      requestNumber: "REQ-1001",
      status: "SUBMITTED_TO_ADMIN",
      createdAt: "2026-08-23",
      start: "2026-08-27",
      days: 3,
      workerIndexes: [0, 1, 2],
    },
    {
      requestNumber: "REQ-1002",
      status: "ADMIN_REVIEW",
      createdAt: "2026-08-22",
      start: "2026-08-26",
      days: 2,
      workerIndexes: [0, 1],
    },
    {
      requestNumber: "REQ-1003",
      status: "PENDING_SIGNATURE",
      createdAt: "2026-08-21",
      start: "2026-08-24",
      days: 3,
      loteNumber: "L-2026-104",
      plannedPaymentDate: "2026-08-28",
      workerIndexes: [0, 2],
    },
    {
      requestNumber: "REQ-1004",
      status: "READY_FOR_PAYMENT",
      createdAt: "2026-08-18",
      start: "2026-08-21",
      days: 3,
      loteNumber: "L-2026-103",
      plannedPaymentDate: "2026-08-26",
      workerIndexes: [0, 1, 2],
      signed: true,
      signedAt: "2026-08-23",
    },
    {
      requestNumber: "REQ-1005",
      status: "TREASURY_RETURNED",
      createdAt: "2026-08-16",
      start: "2026-08-18",
      days: 2,
      loteNumber: "L-2026-102",
      plannedPaymentDate: "2026-08-24",
      workerIndexes: [1, 2],
      signed: true,
      signedAt: "2026-08-20",
      correction: {
        reason: "La fecha prevista no coincide con la ventana del lote bancario.",
        suggestedPaymentDate: "2026-08-27",
        requestedAt: "2026-08-21",
      },
    },
    {
      requestNumber: "REQ-1006",
      status: "PAID",
      createdAt: "2026-08-08",
      start: "2026-08-10",
      days: 3,
      loteNumber: "L-2026-101",
      plannedPaymentDate: "2026-08-14",
      workerIndexes: [0, 1],
      signed: true,
      signedAt: "2026-08-13",
      paidAt: "2026-08-14",
      paymentReference: "TRN-2026-0814-01",
    },
    {
      requestNumber: "REQ-1007",
      status: "PAID",
      createdAt: "2026-08-01",
      start: "2026-08-03",
      days: 3,
      loteNumber: "L-2026-100",
      plannedPaymentDate: "2026-08-07",
      workerIndexes: [0, 1, 2],
      signed: true,
      signedAt: "2026-08-06",
      paidAt: "2026-08-07",
      paymentReference: "TRN-2026-0807-01",
      renditionComplete: true,
    },
  ];

  const created = [];
  for (const scenario of scenarios) {
    created.push(
      await createShowcaseRequest({
        ...scenario,
        area,
        jefe,
        admin,
        tesoreria,
        workers,
        dailyAmount,
      })
    );
  }

  const paidScenario = created.find(
    ({ request }) => request.requestNumber === "REQ-1006"
  );
  const completeScenario = created.find(
    ({ request }) => request.requestNumber === "REQ-1007"
  );

  await prisma.workerViaticBalanceLedger.createMany({
    data: [
      {
        workerId: workers[0].id,
        type: "DEBIT",
        amount: 7000,
        reason: "Viáticos no utilizados",
        relatedRequestVersionId: completeScenario.version.id,
        createdByUserId: admin.id,
      },
      {
        workerId: workers[1].id,
        type: "CREDIT",
        amount: 9000,
        reason: "Diferencia retroactiva agosto 2026",
        relatedRequestVersionId: paidScenario.version.id,
        createdByUserId: admin.id,
      },
    ],
  });

  const retroactiveBatch = await prisma.retroactiveAdjustmentBatch.create({
    data: {
      periodMonth: SHOWCASE_RETROACTIVE_PERIOD,
      effectiveFromDate: date("2026-08-01"),
      oldAmount: 25000,
      newAmount: dailyAmount,
      status: "PAID",
      createdByUserId: admin.id,
    },
  });
  await prisma.retroactiveAdjustmentItem.createMany({
    data: [
      {
        batchId: retroactiveBatch.id,
        workerId: workers[0].id,
        daysAffected: 3,
        amountDiff: 9000,
        status: "PAID",
        relatedPaymentId: paidScenario.payment.id,
      },
      {
        batchId: retroactiveBatch.id,
        workerId: workers[1].id,
        daysAffected: 3,
        amountDiff: 9000,
        status: "PAID",
        relatedPaymentId: paidScenario.payment.id,
      },
    ],
  });

  console.log(
    `Showcase seed completed: ${scenarios.length} solicitudes, ${workers.length} colaboradores y ${colaborador.name} como perfil personal.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
