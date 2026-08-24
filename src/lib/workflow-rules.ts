import type { RequestStatus } from "@prisma/client";
import type { ActionErrorCode, ActionField } from "@/lib/action-result";

export type WorkflowIssue = {
  code: ActionErrorCode;
  message: string;
  field?: ActionField;
};

type ConceptCoverageInput = {
  startDate: Date;
  endDate: Date;
  conceptDates: Date[];
};

type VersionReadinessInput = ConceptCoverageInput & {
  loteNumber?: string | null;
  plannedPaymentDate?: Date | null;
  workerCount: number;
};

type PaymentEligibilityInput = {
  status: RequestStatus;
  hasPayment: boolean;
  hasSignature: boolean;
};

type PaymentInput = {
  paidAt: Date | null;
  paymentReference: string;
};

type TreasuryCorrectionEligibilityInput = {
  status: RequestStatus;
  hasSignature: boolean;
};

export const STANDARDIZE_ALLOWED_STATUSES: RequestStatus[] = [
  "SUBMITTED_TO_ADMIN",
  "ADMIN_REVIEW",
];

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildDateKeys(startDate: Date, endDate: Date) {
  if (endDate < startDate) return [];

  const keys: string[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const last = new Date(endDate);
  last.setUTCHours(0, 0, 0, 0);

  while (current <= last) {
    keys.push(dateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return keys;
}

export function findMissingConceptDates({
  startDate,
  endDate,
  conceptDates,
}: ConceptCoverageInput) {
  const coveredDates = new Set(conceptDates.map(dateKey));
  return buildDateKeys(startDate, endDate).filter(
    (key) => !coveredDates.has(key)
  );
}

export function validateVersionReadiness({
  loteNumber,
  plannedPaymentDate,
  workerCount,
  startDate,
  endDate,
  conceptDates,
}: VersionReadinessInput): WorkflowIssue | null {
  if (!loteNumber?.trim()) {
    return {
      code: "MISSING_LOTE",
      message: "La solicitud necesita un lote antes de continuar.",
      field: "loteNumber",
    };
  }

  if (!plannedPaymentDate) {
    return {
      code: "MISSING_PLANNED_PAYMENT_DATE",
      message: "La solicitud necesita una fecha prevista de pago.",
      field: "plannedPaymentDate",
    };
  }

  if (workerCount <= 0) {
    return {
      code: "MISSING_WORKERS",
      message: "La solicitud debe incluir al menos un trabajador.",
      field: "workerIds",
    };
  }

  const missingDates = findMissingConceptDates({
    startDate,
    endDate,
    conceptDates,
  });
  if (missingDates.length > 0) {
    return {
      code: "MISSING_CONCEPTS",
      message: `Faltan conceptos en ${missingDates.length} día(s) del período.`,
      field: "concepts",
    };
  }

  return null;
}

export function validateStatus(
  status: RequestStatus,
  allowedStatuses: RequestStatus[],
  message: string
): WorkflowIssue | null {
  if (allowedStatuses.includes(status)) return null;
  return { code: "INVALID_STATUS", message };
}

export function validatePaymentEligibility({
  status,
  hasPayment,
  hasSignature,
}: PaymentEligibilityInput): WorkflowIssue | null {
  const expectedStatus: RequestStatus = hasPayment ? "PAID" : "READY_FOR_PAYMENT";
  if (status !== expectedStatus) {
    return {
      code: "INVALID_STATUS",
      message: hasPayment
        ? "Sólo se puede editar un pago de una solicitud pagada."
        : "La solicitud todavía no está lista para registrar el pago.",
    };
  }

  if (!hasSignature) {
    return {
      code: "MISSING_SIGNATURE",
      message: "La versión actual debe estar firmada antes de registrar el pago.",
    };
  }

  return null;
}

export function validatePaymentInput({
  paidAt,
  paymentReference,
}: PaymentInput): WorkflowIssue | null {
  if (!paidAt) {
    return {
      code: "MISSING_PAYMENT_DATE",
      message: "Indica una fecha de pago válida.",
      field: "paidAt",
    };
  }

  if (!paymentReference.trim()) {
    return {
      code: "MISSING_PAYMENT_REFERENCE",
      message: "Ingresa la referencia real del depósito.",
      field: "paymentReference",
    };
  }

  return null;
}

export function validateTreasuryCorrectionEligibility({
  status,
  hasSignature,
}: TreasuryCorrectionEligibilityInput): WorkflowIssue | null {
  if (status !== "READY_FOR_PAYMENT") {
    return {
      code: "INVALID_STATUS",
      message: "Sólo se puede devolver una solicitud lista para pago.",
    };
  }

  if (!hasSignature) {
    return {
      code: "MISSING_SIGNATURE",
      message: "La versión actual debe estar firmada antes de solicitar una corrección.",
    };
  }

  return null;
}
