export type NotificationKind = "ACTION" | "INFO";

export type NotificationWithDate = {
  kind: NotificationKind;
  occurredAt: Date;
};

export function isNotificationUnread(
  kind: NotificationKind,
  occurredAt: Date,
  notificationsSeenAt: Date | null,
) {
  if (kind === "ACTION") {
    return true;
  }

  return !notificationsSeenAt || occurredAt > notificationsSeenAt;
}

export function getNotificationBadgeCount(
  pendingActionCount: number,
  unreadInfoCount: number,
) {
  return Math.max(0, pendingActionCount) + Math.max(0, unreadInfoCount);
}

export function sortNotifications<T extends NotificationWithDate>(items: T[]) {
  return [...items].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "ACTION" ? -1 : 1;
    }

    return right.occurredAt.getTime() - left.occurredAt.getTime();
  });
}
