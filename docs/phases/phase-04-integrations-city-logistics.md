# Faz 4 - Entegrasyonlar ve City Lojistik

## Hedef

Kargo ve ERP/MES entegrasyonlari core is kodundan ayrilmis adapter katmani ile calisir hale getirilecek.

## Kapsam

- `ShippingProviderAdapter` sozlesmesi.
- City Lojistik canli API dokumani ile adapter implementasyonu.
- Shipment create/cancel/tracking/label akislar.
- IntegrationLog ve retry mekanizmasi.
- Webhook endpointleri.
- ERP/MES stok ve fiyat sync taslagi.

## Blokaj

City Lojistik icin canli API dokumani, test hesap bilgisi ve endpointler gerekli. Bu bilgiler olmadan sadece adapter siniri ve testleri tutulur; sahte canli entegrasyon yazilmaz.
