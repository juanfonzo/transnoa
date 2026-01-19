"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function parseDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function diffDaysInclusive(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

function overlapDays(startA: Date, endA: Date, startB: Date, endB: Date) {
  const start = startA > startB ? startA : startB;
  const end = endA < endB ? endA : endB;
  if (start > end) return 0;
  return diffDaysInclusive(start, end);
}

export async function createRateChange(formData: FormData) {
  const effectiveFromDate = parseDate(formData.get("effectiveFromDate"));
  const newAmountRaw = formData.get("newAmount");
  const note = formData.get("note");

  const newAmount =
    typeof newAmountRaw === "string" ? Number(newAmountRaw) : NaN;

  if (!effectiveFromDate || Number.isNaN(newAmount) || newAmount <= 0) {
    return;
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    return;
  }

  const oldRate = await prisma.viaticRateHistory.findFirst({
    where: { effectiveFrom: { lt: effectiveFromDate } },
    orderBy: { effectiveFrom: "desc" },
  });

  await prisma.viaticRateHistory.create({
    data: {
      effectiveFrom: effectiveFromDate,
      amount: new Prisma.Decimal(newAmount),
      note: typeof note === "string" ? note : undefined,
      createdById: admin.id,
    },
  });

  if (!oldRate || oldRate.amount.equals(newAmount)) {
    revalidatePath("/administracion");
    return;
  }

  const monthStart = startOfMonth(effectiveFromDate);
  const dayBefore = new Date(effectiveFromDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  if (dayBefore < monthStart) {
    revalidatePath("/administracion");
    return;
  }

  const versions = await prisma.viaticRequestVersion.findMany({
    where: {
      startDate: { lte: dayBefore },
      endDate: { gte: monthStart },
      request: { status: { not: "CANCELLED" } },
    },
    include: { workers: true },
  });

  const diff = new Prisma.Decimal(newAmount).minus(oldRate.amount);
  const workerMap = new Map<string, { days: number; amount: Prisma.Decimal }>();

  versions.forEach((version) => {
    const rangeDays = diffDaysInclusive(version.startDate, version.endDate);
    const overlapped = overlapDays(version.startDate, version.endDate, monthStart, dayBefore);
    if (overlapped === 0) return;

    version.workers.forEach((worker) => {
      if (!worker.dailyAmount.equals(oldRate.amount)) return;
      const scaledDays = Math.max(
        1,
        Math.round((worker.daysCount * overlapped) / rangeDays)
      );
      const current = workerMap.get(worker.workerId) ?? {
        days: 0,
        amount: new Prisma.Decimal(0),
      };
      current.days += scaledDays;
      current.amount = current.amount.add(diff.mul(scaledDays));
      workerMap.set(worker.workerId, current);
    });
  });

  const batch = await prisma.retroactiveAdjustmentBatch.create({
    data: {
      periodMonth: monthKey(effectiveFromDate),
      effectiveFromDate,
      oldAmount: oldRate.amount,
      newAmount: new Prisma.Decimal(newAmount),
      status: "DRAFT",
      createdByUserId: admin.id,
    },
  });

  const items = Array.from(workerMap.entries())
    .filter(([, value]) => value.days > 0 && !value.amount.equals(0))
    .map(([workerId, value]) => ({
      batchId: batch.id,
      workerId,
      daysAffected: value.days,
      amountDiff: value.amount,
      status: "DRAFT" as const,
    }));

  if (items.length > 0) {
    await prisma.retroactiveAdjustmentItem.createMany({ data: items });
  }

  await prisma.auditLog.create({
    data: {
      entity: "viatic_rate_history",
      entityId: batch.id,
      action: "create_rate_change",
      afterJson: {
        effectiveFrom: effectiveFromDate.toISOString(),
        newAmount,
        oldAmount: Number(oldRate.amount),
      },
      userId: admin.id,
    },
  });

  revalidatePath("/administracion");
}

