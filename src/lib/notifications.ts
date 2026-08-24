import "server-only";

import type { RequestStatus } from "@prisma/client";
import { landingByRole } from "@/lib/demo-experience";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getNotificationBadgeCount,
  isNotificationUnread,
  sortNotifications,
  type NotificationKind,
} from "@/lib/notification-rules";
import { prisma } from "@/lib/prisma";
import type { DemoRole } from "@/lib/roles";

const DEMO_COLLABORATOR_LEGAJO = "1001";
const MAX_VISIBLE_NOTIFICATIONS = 6;

type NotificationDraft = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
};

export type AppNotification = Omit<NotificationDraft, "occurredAt"> & {
  occurredAt: string;
  occurredLabel: string;
  unread: boolean;
};

export type NotificationFeed = {
  role: DemoRole;
  userName: string;
  landingHref: string;
  items: AppNotification[];
  pendingActionCount: number;
  unreadInfoCount: number;
  badgeCount: number;
  available: boolean;
};

type DemoNotificationUser = {
  name: string;
  areaId: string | null;
  notificationsSeenAt: Date | null;
};

function emptyFeed(role: DemoRole, available = true): NotificationFeed {
  return {
    role,
    userName: "Usuario demo",
    landingHref: landingByRole[role],
    items: [],
    pendingActionCount: 0,
    unreadInfoCount: 0,
    badgeCount: 0,
    available,
  };
}

function serializeItems(
  drafts: NotificationDraft[],
  notificationsSeenAt: Date | null,
) {
  return sortNotifications(drafts)
    .slice(0, MAX_VISIBLE_NOTIFICATIONS)
    .map((item): AppNotification => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
      occurredLabel: formatDateTime(item.occurredAt),
      unread: isNotificationUnread(
        item.kind,
        item.occurredAt,
        notificationsSeenAt,
      ),
    }));
}

function buildFeed({
  role,
  user,
  drafts,
  pendingActionCount,
  unreadInfoCount,
}: {
  role: DemoRole;
  user: DemoNotificationUser;
  drafts: NotificationDraft[];
  pendingActionCount: number;
  unreadInfoCount: number;
}): NotificationFeed {
  return {
    role,
    userName: user.name,
    landingHref: landingByRole[role],
    items: serializeItems(drafts, user.notificationsSeenAt),
    pendingActionCount,
    unreadInfoCount,
    badgeCount: getNotificationBadgeCount(
      pendingActionCount,
      unreadInfoCount,
    ),
    available: true,
  };
}

function infoDateFilter(notificationsSeenAt: Date | null) {
  return notificationsSeenAt ? { gt: notificationsSeenAt } : undefined;
}

async function getJefeFeed(
  role: DemoRole,
  user: DemoNotificationUser,
): Promise<NotificationFeed> {
  if (!user.areaId) {
    return buildFeed({
      role,
      user,
      drafts: [],
      pendingActionCount: 0,
      unreadInfoCount: 0,
    });
  }

  const seenFilter = infoDateFilter(user.notificationsSeenAt);
  const [
    pendingActionCount,
    signatureRequests,
    infoRequests,
    unreadPayments,
    unreadReturns,
  ] = await Promise.all([
    prisma.viaticRequest.count({
      where: { areaId: user.areaId, status: "PENDING_SIGNATURE" },
    }),
    prisma.viaticRequest.findMany({
      where: { areaId: user.areaId, status: "PENDING_SIGNATURE" },
      orderBy: { createdAt: "desc" },
      take: MAX_VISIBLE_NOTIFICATIONS,
      select: {
        id: true,
        requestNumber: true,
        createdAt: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            createdAt: true,
            loteNumber: true,
            plannedPaymentDate: true,
          },
        },
      },
    }),
    prisma.viaticRequest.findMany({
      where: {
        areaId: user.areaId,
        status: { in: ["TREASURY_RETURNED", "PAID"] },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_VISIBLE_NOTIFICATIONS,
      select: {
        id: true,
        requestNumber: true,
        status: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            payment: { select: { createdAt: true } },
            correctionRequests: {
              orderBy: { requestedAt: "desc" },
              take: 1,
              select: { requestedAt: true, reason: true },
            },
          },
        },
      },
    }),
    prisma.viaticRequest.count({
      where: {
        areaId: user.areaId,
        status: "PAID",
        versions: {
          some: {
            payment: {
              is: seenFilter ? { createdAt: seenFilter } : {},
            },
          },
        },
      },
    }),
    prisma.viaticRequest.count({
      where: {
        areaId: user.areaId,
        status: "TREASURY_RETURNED",
        versions: {
          some: {
            correctionRequests: {
              some: seenFilter ? { requestedAt: seenFilter } : {},
            },
          },
        },
      },
    }),
  ]);

  const actionDrafts: NotificationDraft[] = signatureRequests.map((request) => {
    const version = request.versions[0];
    return {
      id: `signature-${request.id}`,
      kind: "ACTION",
      title: `${request.requestNumber} espera tu firma`,
      description: version?.loteNumber
        ? `Lote ${version.loteNumber} listo para confirmar.`
        : "La versión final está lista para confirmar.",
      href: `/solicitudes/${request.id}`,
      occurredAt: version?.createdAt ?? request.createdAt,
    };
  });

  const infoDrafts = infoRequests.flatMap((request): NotificationDraft[] => {
    const version = request.versions[0];
    if (request.status === "PAID" && version?.payment) {
      return [{
        id: `paid-${request.id}`,
        kind: "INFO",
        title: `${request.requestNumber} fue pagada`,
        description: "Tesorería registró el pago de la solicitud.",
        href: `/solicitudes/${request.id}`,
        occurredAt: version.payment.createdAt,
      }];
    }

    const correction = version?.correctionRequests[0];
    if (request.status === "TREASURY_RETURNED" && correction) {
      return [{
        id: `returned-${request.id}`,
        kind: "INFO",
        title: `${request.requestNumber} fue devuelta`,
        description: correction.reason,
        href: `/solicitudes/${request.id}`,
        occurredAt: correction.requestedAt,
      }];
    }

    return [];
  });

  return buildFeed({
    role,
    user,
    drafts: [...actionDrafts, ...infoDrafts],
    pendingActionCount,
    unreadInfoCount: unreadPayments + unreadReturns,
  });
}

const adminActionStatuses: RequestStatus[] = [
  "SUBMITTED_TO_ADMIN",
  "ADMIN_REVIEW",
  "TREASURY_RETURNED",
  "ADMIN_CORRECTION",
];

function getAdminCopy(status: RequestStatus, requestNumber: string) {
  switch (status) {
    case "SUBMITTED_TO_ADMIN":
      return {
        title: `${requestNumber} requiere validación`,
        description: "Nueva solicitud enviada por Jefatura.",
      };
    case "ADMIN_REVIEW":
      return {
        title: `Continuá la revisión de ${requestNumber}`,
        description: "La solicitud sigue pendiente de estandarización.",
      };
    case "TREASURY_RETURNED":
      return {
        title: `Corregí ${requestNumber}`,
        description: "Tesorería devolvió la solicitud con observaciones.",
      };
    default:
      return {
        title: `Completá la corrección de ${requestNumber}`,
        description: "La nueva versión debe volver al circuito de firma.",
      };
  }
}

async function getAdminFeed(
  role: DemoRole,
  user: DemoNotificationUser,
): Promise<NotificationFeed> {
  const [pendingActionCount, requests] = await Promise.all([
    prisma.viaticRequest.count({
      where: { status: { in: adminActionStatuses } },
    }),
    prisma.viaticRequest.findMany({
      where: { status: { in: adminActionStatuses } },
      orderBy: { createdAt: "desc" },
      take: MAX_VISIBLE_NOTIFICATIONS,
      select: {
        id: true,
        requestNumber: true,
        status: true,
        createdAt: true,
        area: { select: { name: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            createdAt: true,
            correctionRequests: {
              orderBy: { requestedAt: "desc" },
              take: 1,
              select: { requestedAt: true },
            },
          },
        },
      },
    }),
  ]);

  const drafts: NotificationDraft[] = requests.map((request) => {
    const version = request.versions[0];
    const copy = getAdminCopy(request.status, request.requestNumber);
    return {
      id: `admin-${request.id}-${request.status}`,
      kind: "ACTION",
      title: copy.title,
      description:
        request.status === "SUBMITTED_TO_ADMIN"
          ? `${copy.description} · ${request.area.name}`
          : copy.description,
      href: `/solicitudes/${request.id}`,
      occurredAt:
        version?.correctionRequests[0]?.requestedAt ??
        version?.createdAt ??
        request.createdAt,
    };
  });

  return buildFeed({
    role,
    user,
    drafts,
    pendingActionCount,
    unreadInfoCount: 0,
  });
}

async function getTreasuryFeed(
  role: DemoRole,
  user: DemoNotificationUser,
): Promise<NotificationFeed> {
  const [pendingActionCount, requests] = await Promise.all([
    prisma.viaticRequest.count({ where: { status: "READY_FOR_PAYMENT" } }),
    prisma.viaticRequest.findMany({
      where: { status: "READY_FOR_PAYMENT" },
      orderBy: { createdAt: "desc" },
      take: MAX_VISIBLE_NOTIFICATIONS,
      select: {
        id: true,
        requestNumber: true,
        createdAt: true,
        area: { select: { name: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            createdAt: true,
            loteNumber: true,
            signature: { select: { signedAt: true } },
          },
        },
      },
    }),
  ]);

  const drafts: NotificationDraft[] = requests.map((request) => {
    const version = request.versions[0];
    return {
      id: `payment-${request.id}`,
      kind: "ACTION",
      title: `${request.requestNumber} está lista para pagar`,
      description: `${request.area.name} · Lote ${version?.loteNumber ?? "sin asignar"}`,
      href: `/solicitudes/${request.id}`,
      occurredAt:
        version?.signature?.signedAt ?? version?.createdAt ?? request.createdAt,
    };
  });

  return buildFeed({
    role,
    user,
    drafts,
    pendingActionCount,
    unreadInfoCount: 0,
  });
}

async function getCollaboratorFeed(
  role: DemoRole,
  user: DemoNotificationUser,
): Promise<NotificationFeed> {
  const worker = await prisma.worker.findUnique({
    where: { legajo: DEMO_COLLABORATOR_LEGAJO },
    select: { id: true },
  });

  if (!worker) {
    return buildFeed({
      role,
      user,
      drafts: [],
      pendingActionCount: 0,
      unreadInfoCount: 0,
    });
  }

  const seenFilter = infoDateFilter(user.notificationsSeenAt);
  const [payments, balanceEntries, unreadPayments, unreadBalanceEntries] =
    await Promise.all([
      prisma.viaticRequestWorker.findMany({
        where: {
          workerId: worker.id,
          requestVersion: { payment: { isNot: null } },
        },
        orderBy: { requestVersion: { createdAt: "desc" } },
        take: MAX_VISIBLE_NOTIFICATIONS,
        select: {
          id: true,
          netAmount: true,
          requestVersion: {
            select: {
              request: { select: { id: true, requestNumber: true } },
              payment: { select: { createdAt: true } },
            },
          },
        },
      }),
      prisma.workerViaticBalanceLedger.findMany({
        where: { workerId: worker.id },
        orderBy: { createdAt: "desc" },
        take: MAX_VISIBLE_NOTIFICATIONS,
        select: {
          id: true,
          type: true,
          amount: true,
          reason: true,
          createdAt: true,
          relatedRequest: {
            select: { request: { select: { id: true, requestNumber: true } } },
          },
        },
      }),
      prisma.viaticRequestWorker.count({
        where: {
          workerId: worker.id,
          requestVersion: {
            payment: {
              is: seenFilter ? { createdAt: seenFilter } : {},
            },
          },
        },
      }),
      prisma.workerViaticBalanceLedger.count({
        where: {
          workerId: worker.id,
          ...(seenFilter ? { createdAt: seenFilter } : {}),
        },
      }),
    ]);

  const paymentDrafts = payments.flatMap((payment): NotificationDraft[] => {
    const paymentEvent = payment.requestVersion.payment;
    if (!paymentEvent) {
      return [];
    }

    const request = payment.requestVersion.request;
    return [{
      id: `worker-payment-${payment.id}`,
      kind: "INFO",
      title: `Pago disponible de ${request.requestNumber}`,
      description: `Se registró un pago por ${formatCurrency(Number(payment.netAmount))}.`,
      href: `/solicitudes/${request.id}`,
      occurredAt: paymentEvent.createdAt,
    }];
  });

  const balanceDrafts: NotificationDraft[] = balanceEntries.map((entry) => ({
    id: `balance-${entry.id}`,
    kind: "INFO",
    title: entry.type === "CREDIT" ? "Nuevo saldo a favor" : "Nuevo ajuste de saldo",
    description: `${entry.reason} · ${entry.type === "CREDIT" ? "+" : "-"}${formatCurrency(Number(entry.amount))}`,
    href: entry.relatedRequest
      ? `/solicitudes/${entry.relatedRequest.request.id}`
      : "/colaboradores",
    occurredAt: entry.createdAt,
  }));

  return buildFeed({
    role,
    user,
    drafts: [...paymentDrafts, ...balanceDrafts],
    pendingActionCount: 0,
    unreadInfoCount: unreadPayments + unreadBalanceEntries,
  });
}

export async function getNotificationFeed(
  role: DemoRole,
): Promise<NotificationFeed> {
  try {
    const user = await prisma.user.findFirst({
      where: { role, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        areaId: true,
        notificationsSeenAt: true,
      },
    });

    if (!user) {
      return emptyFeed(role);
    }

    switch (role) {
      case "JEFE_AREA":
        return getJefeFeed(role, user);
      case "ADMIN":
        return getAdminFeed(role, user);
      case "TESORERIA":
        return getTreasuryFeed(role, user);
      case "COLABORADOR":
        return getCollaboratorFeed(role, user);
    }
  } catch {
    console.error("No se pudieron cargar las notificaciones del perfil demo.");
    return emptyFeed(role, false);
  }
}
