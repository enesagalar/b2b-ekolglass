export const dealerApplicationStatuses = [
  "NEW",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_INFO",
] as const;

export const quoteStatuses = [
  "NEW",
  "IN_REVIEW",
  "WAITING_FOR_CUSTOMER_INFO",
  "PRICED",
  "OFFER_SENT",
  "APPROVED",
  "REJECTED",
  "CONVERTED_TO_ORDER",
  "CANCELLED",
] as const;

export const orderStatuses = [
  "DRAFT",
  "SUBMITTED",
  "WAITING_FOR_APPROVAL",
  "CONFIRMED",
  "PREPARING",
  "IN_PRODUCTION",
  "READY_FOR_SHIPMENT",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "ON_HOLD",
] as const;

export const stockStatuses = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "ASK_FOR_AVAILABILITY",
  "MADE_TO_ORDER",
  "RESERVED",
] as const;

export const statusLabels: Record<string, string> = {
  NEW: "Yeni",
  IN_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  NEEDS_INFO: "Bilgi Bekleniyor",
  WAITING_FOR_CUSTOMER_INFO: "Müşteri Bilgisi Bekleniyor",
  PRICED: "Fiyatlandırıldı",
  OFFER_SENT: "Teklif Gönderildi",
  CONVERTED_TO_ORDER: "Siparişe Dönüştü",
  CANCELLED: "İptal Edildi",
  DRAFT: "Taslak",
  SUBMITTED: "Gönderildi",
  WAITING_FOR_APPROVAL: "Onay Bekliyor",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  IN_PRODUCTION: "Üretimde",
  READY_FOR_SHIPMENT: "Sevke Hazır",
  SHIPPED: "Sevk Edildi",
  DELIVERED: "Teslim Edildi",
  ON_HOLD: "Beklemede",
  IN_STOCK: "Stokta",
  LOW_STOCK: "Az Stok",
  OUT_OF_STOCK: "Stok Yok",
  ASK_FOR_AVAILABILITY: "Stok Sorunuz",
  MADE_TO_ORDER: "Üretime Uygun",
  RESERVED: "Rezerve",
};

export function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}
