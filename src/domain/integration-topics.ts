export const emailOutboxTopics = [
  "credential.activation_requested.v1",
  "credential.password_reset_requested.v1",
  "commerce.order.submitted.v1",
  "commerce.order.status_changed.v1",
  "commerce.quote.submitted.v1",
  "commerce.quote.status_changed.v1",
] as const;

export const integrationTopicLabels: Record<string, string> = {
  "credential.activation_requested.v1": "Hesap aktivasyonu",
  "credential.password_reset_requested.v1": "Parola sıfırlama",
  "commerce.order.submitted.v1": "Sipariş alındı",
  "commerce.order.status_changed.v1": "Sipariş durumu",
  "commerce.quote.submitted.v1": "Teklif alındı",
  "commerce.quote.status_changed.v1": "Teklif durumu",
  "shipping.shipment_create_requested.v1": "City sevkiyat oluşturma",
};

export function isReplayableOutboxTopic(topic: string) {
  return (emailOutboxTopics as readonly string[]).includes(topic);
}
