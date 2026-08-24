export type RequestTimelineTone = "slate" | "sky" | "amber" | "emerald" | "rose";

export type RequestTimelineEvent = {
  id: string;
  at: Date;
  title: string;
  description: string;
  tone: RequestTimelineTone;
};

type RequestTimelineVersion = {
  id: string;
  versionNumber: number;
  createdAt: Date;
  createdByName: string;
  signature?: {
    id: string;
    signedAt: Date;
    signedByName: string;
    method: string;
  } | null;
  payment?: {
    id: string;
    createdAt: Date;
    paidAt: Date;
    reference?: string | null;
    createdByName: string;
  } | null;
  corrections: Array<{
    id: string;
    requestedAt: Date;
    requestedByName: string;
    reason: string;
  }>;
  renditions: Array<{
    id: string;
    createdAt: Date;
    workerName: string;
  }>;
};

type RequestTimelineAudit = {
  id: string;
  action: string;
  createdAt: Date;
  userName?: string | null;
};

type RequestTimelineInput = {
  requestCreatedAt: Date;
  createdByName: string;
  versions: RequestTimelineVersion[];
  audits: RequestTimelineAudit[];
};

const auditMeta: Record<
  string,
  { title: string; description: string; tone: RequestTimelineTone }
> = {
  admin_standardize: {
    title: "Lote y fecha validados",
    description: "Administración completó la estandarización.",
    tone: "amber",
  },
  admin_create_correction: {
    title: "Corrección resuelta",
    description: "Administración generó una nueva versión para firma.",
    tone: "sky",
  },
  admin_update_lote: {
    title: "Lote corregido",
    description: "El cambio invalidó la firma anterior y requiere una nueva aprobación.",
    tone: "amber",
  },
  update_payment: {
    title: "Pago actualizado",
    description: "Tesorería actualizó la evidencia del pago.",
    tone: "emerald",
  },
};

export function buildRequestTimeline({
  requestCreatedAt,
  createdByName,
  versions,
  audits,
}: RequestTimelineInput): RequestTimelineEvent[] {
  const events: RequestTimelineEvent[] = [
    {
      id: "request-created",
      at: requestCreatedAt,
      title: "Solicitud creada",
      description: `${createdByName} inició el circuito de viáticos.`,
      tone: "slate",
    },
  ];

  for (const version of versions) {
    events.push({
      id: `version-${version.id}`,
      at: version.createdAt,
      title:
        version.versionNumber === 1
          ? "Versión inicial registrada"
          : `Versión ${version.versionNumber} registrada`,
      description: `Contenido preparado por ${version.createdByName}.`,
      tone: "sky",
    });

    if (version.signature) {
      events.push({
        id: `signature-${version.signature.id}`,
        at: version.signature.signedAt,
        title: `Versión ${version.versionNumber} firmada`,
        description: `${version.signature.signedByName} confirmó el documento mediante ${version.signature.method}.`,
        tone: "emerald",
      });
    }

    if (version.payment) {
      const reference = version.payment.reference
        ? ` Referencia ${version.payment.reference}.`
        : "";
      events.push({
        id: `payment-${version.payment.id}`,
        at: version.payment.createdAt,
        title: "Pago registrado",
        description: `${version.payment.createdByName} confirmó el pago.${reference}`,
        tone: "emerald",
      });
    }

    for (const correction of version.corrections) {
      events.push({
        id: `correction-${correction.id}`,
        at: correction.requestedAt,
        title: "Corrección solicitada",
        description: `${correction.requestedByName}: ${correction.reason}`,
        tone: "rose",
      });
    }

    for (const rendition of version.renditions) {
      events.push({
        id: `rendition-${rendition.id}`,
        at: rendition.createdAt,
        title: "Rendición registrada",
        description: `Se incorporó la rendición de ${rendition.workerName}.`,
        tone: "amber",
      });
    }
  }

  for (const audit of audits) {
    const meta = auditMeta[audit.action];
    if (!meta) continue;
    events.push({
      id: `audit-${audit.id}`,
      at: audit.createdAt,
      title: meta.title,
      description: audit.userName
        ? `${meta.description} Responsable: ${audit.userName}.`
        : meta.description,
      tone: meta.tone,
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
