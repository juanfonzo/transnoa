export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("es-AR").format(value);
}

export function formatDateInput(value?: Date | null) {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

export function formatTimeInput(value?: Date | null) {
  if (!value) {
    return "";
  }
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

