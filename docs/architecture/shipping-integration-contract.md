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

## Canliya Gecis Checklist

1. City Lojistik API dokumani alinacak.
2. Test endpoint ve test cari kodu alinacak.
3. Auth tipi netlestirilecek.
4. Gonderi olusturma, takip, iptal, etiket ve webhook destekleri ayrilacak.
5. Sandbox testleri otomatik hale getirilecek.
6. Canli anahtarlar sadece environment secret olarak tutulacak.
