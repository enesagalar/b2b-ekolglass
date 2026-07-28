import { orderStatuses } from "./statuses";

export const adminOrderQueueScopes = [
  "ALL",
  "REVIEW",
  "BLOCKED",
  "FULFILLMENT",
  "READY_TO_SHIP",
  "IN_TRANSIT",
  "COMPLETED",
] as const;

export type AdminOrderQueueScope = (typeof adminOrderQueueScopes)[number];

const queueStatuses: Record<AdminOrderQueueScope, readonly string[]> = {
  ALL: orderStatuses.filter((status) => status !== "DRAFT"),
  REVIEW: ["SUBMITTED", "WAITING_FOR_APPROVAL"],
  BLOCKED: ["ON_HOLD"],
  FULFILLMENT: ["CONFIRMED", "PREPARING", "IN_PRODUCTION"],
  READY_TO_SHIP: ["READY_FOR_SHIPMENT"],
  IN_TRANSIT: ["SHIPPED"],
  COMPLETED: ["DELIVERED", "CANCELLED"],
};

export const adminOrderQueueLabels: Record<AdminOrderQueueScope, string> = {
  ALL: "Tümü",
  REVIEW: "İncelenecek",
  BLOCKED: "Bekletilen",
  FULFILLMENT: "Hazırlık",
  READY_TO_SHIP: "Sevke hazır",
  IN_TRANSIT: "Yolda",
  COMPLETED: "Tamamlanan",
};

export function resolveAdminOrderQueueScope(value: string | undefined) {
  return adminOrderQueueScopes.includes(value as AdminOrderQueueScope)
    ? (value as AdminOrderQueueScope)
    : "ALL";
}

export function getAdminOrderQueueStatuses(scope: AdminOrderQueueScope) {
  return queueStatuses[scope];
}

export function getAdminOrderTask(status: string, manualCity = false) {
  if (manualCity && status === "READY_FOR_SHIPMENT") {
    return {
      title: "Manuel sevkiyatı tamamla",
      detail: "Taşıyıcı ve takip bilgisini sipariş detayından kaydedin.",
      tone: "warning" as const,
    };
  }

  const tasks: Record<
    string,
    {
      title: string;
      detail: string;
      tone: "info" | "warning" | "success" | "muted";
    }
  > = {
    SUBMITTED: {
      title: "Siparişi incele",
      detail: "Ürün, teslimat ve stok bilgilerini kontrol edin.",
      tone: "info",
    },
    WAITING_FOR_APPROVAL: {
      title: "Ticari kararı ver",
      detail: "Kredi limiti, vade ve açık sipariş riskini değerlendirin.",
      tone: "warning",
    },
    CONFIRMED: {
      title: "Hazırlığı başlat",
      detail: "Siparişi depo toplama sürecine alın.",
      tone: "info",
    },
    PREPARING: {
      title: "Hazırlığı ilerlet",
      detail: "Toplama tamamlandıysa üretim veya sevk adımına geçin.",
      tone: "info",
    },
    IN_PRODUCTION: {
      title: "Üretimi tamamla",
      detail: "Hazır kalemleri sevkiyat sırasına aktarın.",
      tone: "info",
    },
    READY_FOR_SHIPMENT: {
      title: "Sevkiyatı oluştur",
      detail: "Taşıyıcı ve takip bilgisiyle gönderiyi başlatın.",
      tone: "warning",
    },
    SHIPPED: {
      title: "Teslimatı izle",
      detail: "Taşıyıcı hareketlerini ve teslim sonucunu takip edin.",
      tone: "info",
    },
    DELIVERED: {
      title: "Operasyon tamamlandı",
      detail: "Sipariş teslim edildi; yeni işlem gerekmiyor.",
      tone: "success",
    },
    ON_HOLD: {
      title: "Bekletme nedenini çöz",
      detail: "Operasyon veya ticari engeli inceleyip karar verin.",
      tone: "warning",
    },
    CANCELLED: {
      title: "Sipariş kapatıldı",
      detail: "İptal edilen sipariş için yeni işlem gerekmiyor.",
      tone: "muted",
    },
  };

  return (
    tasks[status] ?? {
      title: "Durumu incele",
      detail: "Siparişin güncel operasyon kaydını kontrol edin.",
      tone: "muted" as const,
    }
  );
}
