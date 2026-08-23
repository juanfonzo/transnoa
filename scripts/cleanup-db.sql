-- WARNING: This script deletes transactional data.
-- It preserves: User, Area, Worker, ViaticRateHistory.
-- Run carefully against the intended DATABASE_URL.

BEGIN;

TRUNCATE TABLE
  "AuditLog",
  "ViaticRenditionLeg",
  "ViaticRendition",
  "ViaticRequestDayConcept",
  "Signature",
  "CorrectionRequest",
  "WorkerViaticBalanceLedger",
  "RetroactiveAdjustmentItem",
  "TreasuryPayment",
  "RetroactiveAdjustmentBatch",
  "ViaticRequestWorker",
  "ViaticRequestVersion",
  "ViaticRequest"
RESTART IDENTITY CASCADE;

COMMIT;
