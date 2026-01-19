type CsvValue = string | number | boolean | Date | null | undefined;

function serialize(value: CsvValue) {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

export function toCsv(rows: CsvValue[][]) {
  return rows.map((row) => row.map(serialize).join(",")).join("\n");
}
