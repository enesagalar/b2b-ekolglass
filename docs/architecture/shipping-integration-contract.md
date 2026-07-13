# Kargo Entegrasyon Sozlesmesi

Tum kargo firmalari asagidaki adapter sozlesmesini uygular:

- `createShipment(input)`
- `cancelShipment(externalShipmentId)`
- `getTrackingStatus(trackingNumber)`
- `printLabel(externalShipmentId)`
- gelecekte `calculatePrice(input)`
- gelecekte `handleWebhook(payload)`

## City Lojistik Durumu

City Lojistik icin public ve dogrulanabilir Turkiye API dokumani bulunamadi. Bu nedenle:

- Canli endpoint uydurulmaz.
- Adapter varsayilan olarak pasif gelir.
- `CITY_LOJISTIK_ENABLED=true` olmadan gonderi olusturulamaz.
- `CITY_LOJISTIK_API_BASE_URL`, `CITY_LOJISTIK_API_KEY`, `CITY_LOJISTIK_ACCOUNT_NUMBER` gereklidir.

## Veritabani Modelleri

- `ShippingProvider`: saglayici ve hesap konfigurasyonu.
- `Shipment`: siparisin kargo kaydi.
- `ShipmentEvent`: takip olaylari.
- `IntegrationLog`: API denemeleri, hata ve retry gecmisi.
- `IntegrationOutboxEvent`: is transaction'i ile atomik uretilen, lease ile teslim edilen entegrasyon olayi.

## Transactional Outbox

- Siparis ve teklif islemi yalniz ayni Prisma transaction'i icinde olay uretir.
- Worker olayi tek bir atomik `UPDATE ... RETURNING` ifadesiyle claim eder.
- Harici API veya e-posta cagrisi veritabani transaction'i disinda yapilir.
- Sonuc sadece gecerli `lockToken` sahibi tarafindan yazilabilir.
- Gecici hatalar exponential backoff ile yeniden denenir; kalici veya son deneme hatasi `DEAD` olur.
- Her tamamlanan deneme redakte edilmis bir `IntegrationLog` kaydi uretir.
- Teslimat semantigi `at-least-once`'dir. Saglayici idempotency/reconciliation sozlesmesi dogrulanmadan City gonderi handler'i etkinlestirilmez.
- Payload'a API anahtari, auth header, tam adres veya gereksiz kisi verisi yazilmaz.

Mevcut versiyonlu olaylar:

- `commerce.order.submitted.v1`
- `commerce.order.status_changed.v1`
- `commerce.quote.submitted.v1`
- `commerce.quote.status_changed.v1`
- `commerce.quote.converted_to_order.v1`
- `shipping.shipment_create_requested.v1`

City Lojistik olayi kuyruga alinabilir; ancak dogrulanmis endpoint, auth, DTO ve provider idempotency davranisi gelmeden dis ag cagrisi yapan handler yazilmaz.

## Canliya Gecis Checklist

1. City Lojistik API dokumani alinacak.
2. Test endpoint ve test cari kodu alinacak.
3. Auth tipi netlestirilecek.
4. Gonderi olusturma, takip, iptal, etiket ve webhook destekleri ayrilacak.
5. Sandbox testleri otomatik hale getirilecek.
6. Canli anahtarlar sadece environment secret olarak tutulacak.
