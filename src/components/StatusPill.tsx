"use client";

import type { RequestStatus } from "@prisma/client";
import { getRequestStatusLabel, getStatusTone, getToneClasses } from "@/lib/status";

type StatusPillProps = {
  status: RequestStatus;
};

export function StatusPill({ status }: StatusPillProps) {
  const tone = getStatusTone(status);

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getToneClasses(tone)}`}>
      {getRequestStatusLabel(status)}
    </span>
  );
}

