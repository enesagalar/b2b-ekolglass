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

## 2026-07-16 Hazirlik Dilimi

- Resmi Turkiye alan adlarinda kamuya acik API sozlesmesi bulunamadigi yeniden dogrulandi.
- `.env` konfigurasyonu tek basina canli aktarimi acamayacak kod seviyesi kabul kapisi eklendi.
- HTTPS endpoint, sozlesme surumu, credential ve musteri hesap numarasi ayri readiness kontrollerine donusturuldu.
- Admin entegrasyon ekraninda secret gostermeyen City Lojistik hazirlik paneli eklendi.
- Otomasyon kapaliyken City siparisleri isleyicisiz outbox'a atilmak yerine manuel sevk intent'i olarak kaydediliyor.
- Admin entegrasyon ekraninda manuel sevk bekleyen sayi ve siparis baglantilari gosteriliyor.
- Tam teknik talep listesi ve iletisim e-posta taslagi `docs/operations/city-logistics-onboarding.md` dosyasina yazildi.
- Canli adapter, test hesabi ve surumlu dokuman gelene kadar blokajda kalir.
