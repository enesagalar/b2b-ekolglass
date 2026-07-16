const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const maxRangeDays = 366;
const dayMs = 86_400_000;
const istanbulUtcOffsetMs = 3 * 60 * 60 * 1_000;

function istanbulDayStart(value: string) {
  if (!datePattern.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(utcDate.getTime() - istanbulUtcOffsetMs);
}

export function formatReportDateInput(date: Date) {
  return reportDayKey(date);
}

export function resolveReportPeriod(input: {
  from?: string;
  to?: string;
  currency?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const defaultTo = istanbulDayStart(reportDayKey(now))!;
  const defaultFrom = new Date(defaultTo.getTime() - 29 * dayMs);
  const from = istanbulDayStart(input.from ?? "") ?? defaultFrom;
  const toInclusive = istanbulDayStart(input.to ?? "") ?? defaultTo;

  if (from > toInclusive) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
  }
  const rangeDays = Math.floor((toInclusive.getTime() - from.getTime()) / dayMs) + 1;
  if (rangeDays > maxRangeDays) {
    throw new Error("Rapor dönemi en fazla 366 gün olabilir.");
  }
  const toExclusive = new Date(toInclusive.getTime() + dayMs);
  const normalizedCurrency = input.currency?.trim().toUpperCase() || "TRY";
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error("Para birimi geçersizdir.");
  }

  return {
    from,
    toInclusive,
    toExclusive,
    fromInput: formatReportDateInput(from),
    toInput: formatReportDateInput(toInclusive),
    rangeDays,
    currency: normalizedCurrency,
  };
}

export function reportDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
