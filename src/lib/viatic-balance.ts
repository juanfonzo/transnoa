import type { Prisma } from "@prisma/client";

export type BalanceApplication = {
  appliedAmount: Prisma.Decimal;
  netAmount: Prisma.Decimal;
};

export function calculateBalanceApplication(
  grossAmount: Prisma.Decimal,
  currentBalance: Prisma.Decimal,
): BalanceApplication {
  const appliedAmount =
    currentBalance.isNegative() && currentBalance.abs().greaterThan(grossAmount)
      ? grossAmount.negated()
      : currentBalance;

  return {
    appliedAmount,
    netAmount: grossAmount.add(appliedAmount),
  };
}

export function getBalanceSettlementType(
  appliedAmount: Prisma.Decimal,
): "CREDIT" | "DEBIT" | null {
  if (appliedAmount.isZero()) return null;
  return appliedAmount.isPositive() ? "DEBIT" : "CREDIT";
}
