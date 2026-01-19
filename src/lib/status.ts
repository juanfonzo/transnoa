import { RequestStatus } from "@prisma/client";

type StatusMeta = {
  label: string;
  description?: string;
  tone: "slate" | "amber" | "emerald" | "sky" | "rose";
};

export const requestStatusMeta: Record<RequestStatus, StatusMeta> = {
  DRAFT: {
    label: "Borrador",
    description: "Sin enviar aun",
    tone: "slate",
  },
  SUBMITTED_TO_ADMIN: {
    label: "Enviado a administracion",
    description: "Listo para validar",
    tone: "sky",
  },
  ADMIN_REVIEW: {
    label: "En revision",
    description: "Admin revisando",
    tone: "amber",
  },
  PENDING_SIGNATURE: {
    label: "Pendiente de firma",
    description: "Jefe debe firmar",
    tone: "amber",
  },
  SIGNED: {
    label: "Firmado",
    description: "Listo para tesoreria",
    tone: "sky",
  },
  SENT_TO_TREASURY: {
    label: "En tesoreria",
    description: "Listo para pago",
    tone: "sky",
  },
  TREASURY_RETURNED: {
    label: "Devuelto por tesoreria",
    description: "Requiere correccion",
    tone: "rose",
  },
  ADMIN_CORRECTION: {
    label: "En correccion",
    description: "Admin ajustando",
    tone: "amber",
  },
  READY_FOR_PAYMENT: {
    label: "Listo para pagar",
    description: "Esperando pago",
    tone: "emerald",
  },
  PAID: {
    label: "Pagado",
    description: "Pago registrado",
    tone: "emerald",
  },
  CANCELLED: {
    label: "Anulado",
    description: "Solicitud anulada",
    tone: "rose",
  },
};

export function getRequestStatusLabel(status: RequestStatus) {
  return requestStatusMeta[status]?.label ?? status;
}

export function getRequestStatusDescription(status: RequestStatus) {
  return requestStatusMeta[status]?.description ?? "";
}

export function getStatusTone(status: RequestStatus) {
  return requestStatusMeta[status]?.tone ?? "slate";
}

export function getToneClasses(tone: StatusMeta["tone"]) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-800",
    sky: "bg-sky-100 text-sky-800",
    rose: "bg-rose-100 text-rose-800",
  };

  return tones[tone] ?? tones.slate;
}

