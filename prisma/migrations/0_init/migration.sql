-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('JEFE_AREA', 'COLABORADOR', 'ADMIN', 'TESORERIA');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED_TO_ADMIN', 'ADMIN_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'SENT_TO_TREASURY', 'TREASURY_RETURNED', 'ADMIN_CORRECTION', 'READY_FOR_PAYMENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('OPEN', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'READY_FOR_PAYMENT', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "areaId" TEXT,
    "signatureUrl" TEXT,
    "signaturePinHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "legajo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dni" TEXT,
    "cbu" TEXT,
    "bank" TEXT,
    "province" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRateHistory" (
    "id" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRequestVersion" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "plannedPaymentDate" TIMESTAMP(3),
    "loteNumber" TEXT,
    "notes" TEXT,
    "payloadJson" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticRequestVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRequestWorker" (
    "id" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "daysCount" DECIMAL(6,2) NOT NULL,
    "dailyAmount" DECIMAL(12,2) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "balanceAppliedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ViaticRequestWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRendition" (
    "id" TEXT NOT NULL,
    "requestWorkerId" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "consumedViaticos" DECIMAL(6,2),
    "reason" TEXT,
    "vehiclePlate" TEXT,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViaticRendition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRenditionLeg" (
    "id" TEXT NOT NULL,
    "renditionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "departureLocation" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3),
    "departureKm" INTEGER,
    "arrivalLocation" TEXT NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "arrivalKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViaticRenditionLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViaticRequestDayConcept" (
    "id" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "conceptText" TEXT NOT NULL,
    "conceptCode" TEXT,

    CONSTRAINT "ViaticRequestDayConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "signedByUserId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureAssetUrl" TEXT,
    "signatureMethod" TEXT NOT NULL,
    "docHash" TEXT,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryPayment" (
    "id" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentReference" TEXT,
    "attachmentUrl" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "requestVersionId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "suggestedPaymentDate" TIMESTAMP(3),
    "status" "CorrectionStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerViaticBalanceLedger" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "type" "BalanceType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedRequestVersionId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerViaticBalanceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroactiveAdjustmentBatch" (
    "id" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "effectiveFromDate" TIMESTAMP(3) NOT NULL,
    "oldAmount" DECIMAL(12,2) NOT NULL,
    "newAmount" DECIMAL(12,2) NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetroactiveAdjustmentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroactiveAdjustmentItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "daysAffected" DECIMAL(6,2) NOT NULL,
    "amountDiff" DECIMAL(12,2) NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "relatedPaymentId" TEXT,

    CONSTRAINT "RetroactiveAdjustmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_legajo_key" ON "Worker"("legajo");

-- CreateIndex
CREATE INDEX "ViaticRateHistory_effectiveFrom_idx" ON "ViaticRateHistory"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ViaticRequest_requestNumber_key" ON "ViaticRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ViaticRequest_status_idx" ON "ViaticRequest"("status");

-- CreateIndex
CREATE INDEX "ViaticRequest_areaId_idx" ON "ViaticRequest"("areaId");

-- CreateIndex
CREATE INDEX "ViaticRequestVersion_requestId_idx" ON "ViaticRequestVersion"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "ViaticRequestVersion_requestId_versionNumber_key" ON "ViaticRequestVersion"("requestId", "versionNumber");

-- CreateIndex
CREATE INDEX "ViaticRequestWorker_requestVersionId_idx" ON "ViaticRequestWorker"("requestVersionId");

-- CreateIndex
CREATE INDEX "ViaticRequestWorker_workerId_idx" ON "ViaticRequestWorker"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "ViaticRendition_requestWorkerId_key" ON "ViaticRendition"("requestWorkerId");

-- CreateIndex
CREATE INDEX "ViaticRendition_requestVersionId_idx" ON "ViaticRendition"("requestVersionId");

-- CreateIndex
CREATE INDEX "ViaticRendition_workerId_idx" ON "ViaticRendition"("workerId");

-- CreateIndex
CREATE INDEX "ViaticRenditionLeg_renditionId_idx" ON "ViaticRenditionLeg"("renditionId");

-- CreateIndex
CREATE INDEX "ViaticRequestDayConcept_requestVersionId_idx" ON "ViaticRequestDayConcept"("requestVersionId");

-- CreateIndex
CREATE INDEX "ViaticRequestDayConcept_date_idx" ON "ViaticRequestDayConcept"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_requestVersionId_key" ON "Signature"("requestVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryPayment_requestVersionId_key" ON "TreasuryPayment"("requestVersionId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_idx" ON "CorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "WorkerViaticBalanceLedger_workerId_idx" ON "WorkerViaticBalanceLedger"("workerId");

-- CreateIndex
CREATE INDEX "RetroactiveAdjustmentBatch_status_idx" ON "RetroactiveAdjustmentBatch"("status");

-- CreateIndex
CREATE INDEX "RetroactiveAdjustmentItem_batchId_idx" ON "RetroactiveAdjustmentItem"("batchId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRateHistory" ADD CONSTRAINT "ViaticRateHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequest" ADD CONSTRAINT "ViaticRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequest" ADD CONSTRAINT "ViaticRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequestVersion" ADD CONSTRAINT "ViaticRequestVersion_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ViaticRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequestVersion" ADD CONSTRAINT "ViaticRequestVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequestWorker" ADD CONSTRAINT "ViaticRequestWorker_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequestWorker" ADD CONSTRAINT "ViaticRequestWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRendition" ADD CONSTRAINT "ViaticRendition_requestWorkerId_fkey" FOREIGN KEY ("requestWorkerId") REFERENCES "ViaticRequestWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRendition" ADD CONSTRAINT "ViaticRendition_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRendition" ADD CONSTRAINT "ViaticRendition_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRendition" ADD CONSTRAINT "ViaticRendition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRenditionLeg" ADD CONSTRAINT "ViaticRenditionLeg_renditionId_fkey" FOREIGN KEY ("renditionId") REFERENCES "ViaticRendition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViaticRequestDayConcept" ADD CONSTRAINT "ViaticRequestDayConcept_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryPayment" ADD CONSTRAINT "TreasuryPayment_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryPayment" ADD CONSTRAINT "TreasuryPayment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestVersionId_fkey" FOREIGN KEY ("requestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerViaticBalanceLedger" ADD CONSTRAINT "WorkerViaticBalanceLedger_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerViaticBalanceLedger" ADD CONSTRAINT "WorkerViaticBalanceLedger_relatedRequestVersionId_fkey" FOREIGN KEY ("relatedRequestVersionId") REFERENCES "ViaticRequestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerViaticBalanceLedger" ADD CONSTRAINT "WorkerViaticBalanceLedger_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveAdjustmentBatch" ADD CONSTRAINT "RetroactiveAdjustmentBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveAdjustmentItem" ADD CONSTRAINT "RetroactiveAdjustmentItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RetroactiveAdjustmentBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveAdjustmentItem" ADD CONSTRAINT "RetroactiveAdjustmentItem_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveAdjustmentItem" ADD CONSTRAINT "RetroactiveAdjustmentItem_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "TreasuryPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
