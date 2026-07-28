import { orderStatuses } from "./statuses";

export const dealerOrderScopes = [
  "ALL",
  "REVIEW",
  "PREPARING",
  "IN_TRANSIT",
  "COMPLETED",
] as const;

export type DealerOrderScope = (typeof dealerOrderScopes)[number];

const scopeStatuses: Record<DealerOrderScope, readonly string[]> = {
  ALL: orderStatuses.filter((status) => status !== "DRAFT"),
  REVIEW: ["SUBMITTED", "WAITING_FOR_APPROVAL", "ON_HOLD"],
  PREPARING: [
    "CONFIRMED",
    "PREPARING",
    "IN_PRODUCTION",
    "READY_FOR_SHIPMENT",
  ],
  IN_TRANSIT: ["SHIPPED"],
  COMPLETED: ["DELIVERED", "CANCELLED"],
};

export const dealerOrderScopeLabels: Record<DealerOrderScope, string> = {
  ALL: "Tümü",
  REVIEW: "İncelemede",
  PREPARING: "Hazırlanıyor",
  IN_TRANSIT: "Yolda",
  COMPLETED: "Geçmiş",
};

export function resolveDealerOrderScope(value: string | undefined) {
  return dealerOrderScopes.includes(value as DealerOrderScope)
    ? (value as DealerOrderScope)
    : "ALL";
}

export function getDealerOrderScopeStatuses(scope: DealerOrderScope) {
  return scopeStatuses[scope];
}

export function getDealerOrderJourney(
  status: string,
  trackingNumber?: string | null,
) {
  const journeys: Record<
    string,
    { title: string; detail: string; tone: "info" | "warning" | "success" | "muted" }
  > = {
    SUBMITTED: {
      title: "Satış kontrolü bekleniyor",
      detail: "Sipariş alındı; ürün ve teslimat bilgileri kontrol ediliyor.",
      tone: "info",
    },
    WAITING_FOR_APPROVAL: {
      title: "Ticari onay bekleniyor",
      detail: "Stok ayrıldı; limit veya ödeme koşulu incelemesi tamamlanacak.",
      tone: "warning",
    },
    CONFIRMED: {
      title: "Hazırlık sırasına alındı",
      detail: "Sipariş onaylandı; depo hazırlığı başlayacak.",
      tone: "info",
    },
    PREPARING: {
      title: "Depoda hazırlanıyor",
      detail: "Sipariş kalemleri sevkiyat için toplanıyor.",
      tone: "info",
    },
    IN_PRODUCTION: {
      title: "Üretim sürecinde",
      detail: "Üretim gerektiren kalemler hazırlanıyor.",
      tone: "info",
    },
    READY_FOR_SHIPMENT: {
      title: "Sevke hazır",
      detail: "Paketleme tamamlandı; taşıma planı bekleniyor.",
      tone: "success",
    },
    SHIPPED: {
      title: trackingNumber ? "Gönderi yolda" : "Sevk edildi",
      detail: trackingNumber
        ? `Takip numarası: ${trackingNumber}`
        : "Taşıyıcı takip numarasının sisteme işlenmesi bekleniyor.",
      tone: "info",
    },
    DELIVERED: {
      title: "Teslim edildi",
      detail: "Sipariş teslimat sürecini tamamladı.",
      tone: "success",
    },
    ON_HOLD: {
      title: "İnceleme için bekletiliyor",
      detail: "Satış ekibi siparişteki operasyonel veya ticari durumu inceliyor.",
      tone: "warning",
    },
    CANCELLED: {
      title: "Sipariş iptal edildi",
      detail: "Bu sipariş için hazırlık ve sevkiyat süreci kapatıldı.",
      tone: "muted",
    },
  };

  return (
    journeys[status] ?? {
      title: "Durum güncelleniyor",
      detail: "Siparişin güncel operasyon bilgisi hazırlanıyor.",
      tone: "muted" as const,
    }
  );
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const istanbulOffsetMs = 3 * 60 * 60 * 1_000;
const dayMs = 86_400_000;

function parseIstanbulDay(value: string) {
  if (!datePattern.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return new Date(utc.getTime() - istanbulOffsetMs);
}

export function resolveDealerOrderDateRange(input: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const dateFromInput = input.dateFrom?.trim() ?? "";
  const dateToInput = input.dateTo?.trim() ?? "";
  const from = dateFromInput ? parseIstanbulDay(dateFromInput) : undefined;
  const toStart = dateToInput ? parseIstanbulDay(dateToInput) : undefined;

  if (dateFromInput && !from) {
    return {
      dateFromInput,
      dateToInput,
      error: "Başlangıç tarihi geçersizdir.",
    };
  }
  if (dateToInput && !toStart) {
    return {
      dateFromInput,
      dateToInput,
      error: "Bitiş tarihi geçersizdir.",
    };
  }
  if (from && toStart && from > toStart) {
    return {
      dateFromInput,
      dateToInput,
      error: "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
    };
  }

  return {
    dateFromInput,
    dateToInput,
    from,
    toExclusive: toStart
      ? new Date(toStart.getTime() + dayMs)
      : undefined,
    error: null,
  };
}
