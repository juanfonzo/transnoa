type CellValue = string | number | boolean | Date | null | undefined;

function serialize(value: CellValue) {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toExcelHtml(rows: CellValue[][]) {
  const body = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${escapeHtml(serialize(cell))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    "<!doctype html>",
    "<html>",
    "<head><meta charset=\"utf-8\" /></head>",
    "<body>",
    "<table>",
    body,
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}
