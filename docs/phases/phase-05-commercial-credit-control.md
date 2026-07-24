# Faz 5 - Ticari Kredi Kontrolu

## Durum

Tamamlandi.

## Is Kurali

- Kredi exposure'i acik siparis taahhududur; `SUBMITTED`, `WAITING_FOR_APPROVAL`, `CONFIRMED`, `PREPARING`, `IN_PRODUCTION`, `READY_FOR_SHIPMENT`, `SHIPPED` ve `ON_HOLD` dahildir.
- `CANCELLED`, `DELIVERED` ve `DRAFT` acik siparis exposure'ina dahil degildir.
- Ilk surumde kredi limiti TRY bazlidir. Farkli para birimi ticari inceleme gerektirir; otomatik kur donusumu yapilmaz.
- `UNSET` manuel ticari inceleme, `LIMITED` tanimli limit kontrolu, `UNLIMITED` acik limitsiz politika anlamina gelir.
- Limit asimi bayi siparisini kaybetmez veya checkout'u engellemez. Siparis
  `WAITING_FOR_APPROVAL` durumunda olusur, stok ayrilir ve ticari onaya gider.
- Bayi checkout'u limit, mevcut exposure, siparis sonrasi exposure ve asim
  tutarini gonderimden once gosterir.
- `CONFIRMED` gecisinde guncel firma kosullari ve exposure ayni transaction icinde yeniden hesaplanir.
- Riskli onay icin hem `order.approve` hem `order.credit.override` yetkisi ve en az 10 karakterlik ic gerekce gerekir.

## Veri Ve Guvenlik

- Sipariste odeme kosulu, kredi politikasi, limit ve exposure anlik goruntusu tutulur.
- Checkout ve durum gecisi mevcut `order-checkout` kilidiyle serialize edilir.
- Bilinmeyen politika ve TRY disi para birimi fail-closed davranir.
- Firma ticari kosul degisiklikleri ve basarili override kararlari aktor ve onceki/yeni degerlerle audit edilir.
- Admin durum gecisi notlari bayi DAL'ina alinmaz. Override gerekcesi yalniz ic ekranda gorulur.

## Kabul Kaniti

- Limitte esitlik otomatik uygun, limit ustu manuel incelemedir.
- Yetkisiz veya gerekcesiz riskli onay reddedilir ve siparis surumu degismez.
- Yetkili override aktor, zaman, gerekce ve exposure degerleriyle atomik kaydedilir.
- Firma ekranindan kredi politikasi, limit, odeme kosulu ve iskonto kontrollu bicimde guncellenebilir.
- Migration zinciri, domain, action, checkout ve durum gecisi testleri bu kurallari kapsar.
