import { quoteStatuses } from "./statuses";

export const adminQuoteArchiveScopes = [
  "ALL",
  "OPEN",
  "OFFERED",
  "CONVERTED",
  "CLOSED",
] as const;

export type AdminQuoteArchiveScope =
  (typeof adminQuoteArchiveScopes)[number];

const archiveStatuses: Record<
  AdminQuoteArchiveScope,
  readonly (typeof quoteStatuses)[number][]
> = {
  ALL: quoteStatuses,
  OPEN: ["NEW", "IN_REVIEW", "WAITING_FOR_CUSTOMER_INFO"],
  OFFERED: ["PRICED", "OFFER_SENT", "APPROVED"],
  CONVERTED: ["CONVERTED_TO_ORDER"],
  CLOSED: ["REJECTED", "CANCELLED"],
};

export const adminQuoteArchiveLabels: Record<
  AdminQuoteArchiveScope,
  string
> = {
  ALL: "Tümü",
  OPEN: "Açık eski kayıtlar",
  OFFERED: "Teklif ve karar",
  CONVERTED: "Siparişe dönüşen",
  CLOSED: "Kapanan",
};

export function resolveAdminQuoteArchiveScope(value: string | undefined) {
  return adminQuoteArchiveScopes.includes(value as AdminQuoteArchiveScope)
    ? (value as AdminQuoteArchiveScope)
    : "ALL";
}

export function getAdminQuoteArchiveStatuses(
  scope: AdminQuoteArchiveScope,
) {
  return archiveStatuses[scope];
}

export function getAdminQuoteArchiveTask(
  status: string,
  convertedOrderNumber?: string | null,
) {
  const tasks: Record<
    string,
    {
      title: string;
      detail: string;
      tone: "info" | "warning" | "success" | "muted";
    }
  > = {
    NEW: {
      title: "Eski talebi incele",
      detail: "Kapatılmadan önce açılan bu kaydın kapsamını kontrol edin.",
      tone: "warning",
    },
    IN_REVIEW: {
      title: "İncelemeyi tamamla",
      detail: "Geçmiş talebin fiyat ve firma bilgisini sonuçlandırın.",
      tone: "info",
    },
    WAITING_FOR_CUSTOMER_INFO: {
      title: "Eksik bilgiyi takip et",
      detail: "Beklenen müşteri bilgisini kayda ekleyip süreci sonuçlandırın.",
      tone: "warning",
    },
    PRICED: {
      title: "Fiyat kaydını kontrol et",
      detail: "Hazırlanan eski fiyat revizyonunun geçerliliğini inceleyin.",
      tone: "info",
    },
    OFFER_SENT: {
      title: "Müşteri kararını izle",
      detail: "Gönderilmiş teklifin kabul veya kapanış sonucunu kaydedin.",
      tone: "info",
    },
    APPROVED: {
      title: "Sipariş dönüşümünü tamamla",
      detail: "Onaylanmış eski teklifi siparişe dönüştürün veya kapatın.",
      tone: "warning",
    },
    REJECTED: {
      title: "Arşiv kaydı",
      detail: "Reddedilen teklif için yeni işlem gerekmiyor.",
      tone: "muted",
    },
    CONVERTED_TO_ORDER: {
      title: "Sipariş izini aç",
      detail: convertedOrderNumber
        ? `${convertedOrderNumber} numaralı siparişe dönüştürüldü.`
        : "Dönüşen sipariş kaydını teklif detayından doğrulayın.",
      tone: "success",
    },
    CANCELLED: {
      title: "Arşiv kaydı",
      detail: "İptal edilen teklif için yeni işlem gerekmiyor.",
      tone: "muted",
    },
  };

  return (
    tasks[status] ?? {
      title: "Arşiv kaydını incele",
      detail: "Teklifin geçmiş durum ve işlem izini kontrol edin.",
      tone: "muted" as const,
    }
  );
}
