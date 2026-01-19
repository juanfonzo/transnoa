const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const area = await prisma.area.upsert({
    where: { name: "Santiago del Estero" },
    update: {},
    create: { name: "Santiago del Estero" },
  });

  const [jefe, admin, tesoreria, colaborador] = await Promise.all([
    prisma.user.upsert({
      where: { email: "jefe.area@transnoa.demo" },
      update: { name: "Jefe de Area", role: "JEFE_AREA", areaId: area.id },
      create: {
        name: "Jefe de Area",
        email: "jefe.area@transnoa.demo",
        role: "JEFE_AREA",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@transnoa.demo" },
      update: { name: "Administracion", role: "ADMIN", areaId: area.id },
      create: {
        name: "Administracion",
        email: "admin@transnoa.demo",
        role: "ADMIN",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "tesoreria@transnoa.demo" },
      update: { name: "Tesoreria", role: "TESORERIA", areaId: area.id },
      create: {
        name: "Tesoreria",
        email: "tesoreria@transnoa.demo",
        role: "TESORERIA",
        areaId: area.id,
      },
    }),
    prisma.user.upsert({
      where: { email: "colaborador@transnoa.demo" },
      update: { name: "Colaborador", role: "COLABORADOR", areaId: area.id },
      create: {
        name: "Colaborador",
        email: "colaborador@transnoa.demo",
        role: "COLABORADOR",
        areaId: area.id,
      },
    }),
  ]);

  const workers = await Promise.all([
    prisma.worker.upsert({
      where: { legajo: "1001" },
      update: { name: "Carlos Ruiz" },
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
      update: { name: "Lucia Gomez" },
      create: {
        legajo: "1002",
        name: "Lucia Gomez",
        dni: "30987654",
        cbu: "0000000000000000000002",
        bank: "Banco Demo",
        province: "Santiago del Estero",
        status: "Activo",
      },
    }),
    prisma.worker.upsert({
      where: { legajo: "1003" },
      update: { name: "Miguel Perez" },
      create: {
        legajo: "1003",
        name: "Miguel Perez",
        dni: "30111111",
        cbu: "0000000000000000000003",
        bank: "Banco Demo",
        province: "Santiago del Estero",
        status: "Activo",
      },
    }),
  ]);

  await prisma.viaticRateHistory.create({
    data: {
      effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      amount: 25000,
      note: "Monto base enero 2026",
      createdById: admin.id,
    },
  });

  const request = await prisma.viaticRequest.create({
    data: {
      requestNumber: "REQ-0001",
      areaId: area.id,
      createdByUserId: jefe.id,
      status: "PAID",
      currentVersionNumber: 1,
    },
  });

  const version = await prisma.viaticRequestVersion.create({
    data: {
      requestId: request.id,
      versionNumber: 1,
      startDate: new Date("2026-01-10T00:00:00Z"),
      endDate: new Date("2026-01-12T00:00:00Z"),
      plannedPaymentDate: new Date("2026-01-15T00:00:00Z"),
      loteNumber: "L-2026-0001",
      notes: "Solicitud demo",
      createdByUserId: admin.id,
    },
  });

  const dailyAmount = 25000;

  await prisma.viaticRequestWorker.createMany({
    data: workers.map((worker) => ({
      requestVersionId: version.id,
      workerId: worker.id,
      daysCount: 3,
      dailyAmount,
      grossAmount: dailyAmount * 3,
      balanceAppliedAmount: 0,
      netAmount: dailyAmount * 3,
    })),
  });

  const dayConcepts = [
    { date: new Date("2026-01-10T00:00:00Z"), conceptText: "Montaje" },
    { date: new Date("2026-01-11T00:00:00Z"), conceptText: "Mantenimiento" },
    { date: new Date("2026-01-12T00:00:00Z"), conceptText: "Inspeccion" },
  ];

  await prisma.viaticRequestDayConcept.createMany({
    data: dayConcepts.map((concept) => ({
      requestVersionId: version.id,
      ...concept,
    })),
  });

  await prisma.signature.create({
    data: {
      requestVersionId: version.id,
      signedByUserId: jefe.id,
      signatureMethod: "PIN",
      signatureAssetUrl: null,
      docHash: "demo-hash",
    },
  });

  await prisma.treasuryPayment.create({
    data: {
      requestVersionId: version.id,
      paidAt: new Date("2026-01-20T00:00:00Z"),
      paymentReference: "DEP-0001",
      notes: "Pago demo",
      createdByUserId: tesoreria.id,
    },
  });

  await prisma.workerViaticBalanceLedger.create({
    data: {
      workerId: workers[0].id,
      type: "DEBIT",
      amount: 5000,
      reason: "Ajuste manual demo",
      relatedRequestVersionId: version.id,
      createdByUserId: admin.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      entity: "viatic_request",
      entityId: request.id,
      action: "seed",
      afterJson: { status: "PAID" },
      userId: admin.id,
    },
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

