import { getStatusLabel } from "@/domain/statuses";

export function formatPortalDate(value: Date | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export function formatPortalMoney(value: { toString(): string } | number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function PortalStatus({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" || status === "APPROVED" || status === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-800"
      : status === "CANCELLED" || status === "REJECTED"
        ? "bg-red-50 text-red-700"
        : status === "ON_HOLD" ||
            status === "WAITING_FOR_CUSTOMER_INFO" ||
            status === "WAITING_FOR_APPROVAL"
          ? "bg-amber-50 text-amber-800"
          : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${tone}`}>{getStatusLabel(status)}</span>;
}
