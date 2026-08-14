export function formatReportDate(value: string | null | undefined): string {
  const date = new Date(value ?? "");

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}
