const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function dateOnlyKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDateOnlyDays(value: Date, days: number) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + days,
    ),
  );
}

export function diffDateOnlyDaysInclusive(start: Date, end: Date) {
  const startTime = addDateOnlyDays(start, 0).getTime();
  const endTime = addDateOnlyDays(end, 0).getTime();
  if (endTime < startTime) return 0;
  return Math.floor((endTime - startTime) / DAY_IN_MS) + 1;
}

export function buildDateOnlyKeys(start: Date, end: Date) {
  if (end < start) return [];
  const days = diffDateOnlyDaysInclusive(start, end);
  return Array.from({ length: days }, (_, index) =>
    dateOnlyKey(addDateOnlyDays(start, index)),
  );
}

export function formatDateOnly(
  value?: Date | null,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    ...options,
    timeZone: "UTC",
  }).format(value);
}
