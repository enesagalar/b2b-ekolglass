# Siparis Checkout Security ve UX Incelemesi

Tarih: 2026-07-13

## Inceleme Kollari

- Veri modeli, tenant izolasyonu, idempotency ve stok yarisi guvenligi.
- Bayi urun detayi, sepet, checkout, basari ve siparis takip yolculugu.
- SQLite entegrasyon testi ve rollback senaryolari.

## Uygulanan Kararlar

- Teklif sepeti ve siparis sepeti ayri aggregate olarak tutuldu.
- Sepete `version` eklenerek eski sekmeden gonderim engellendi.
- Idempotency anahtari firma kapsaminda unique yapildi; payload `requestHash` ile baglandi.
- Checkout transaction'inin ilk yazma islemi `CheckoutLock` uzerinden yapilarak SQLite write lock erken alindi.
- Kullanici, firma, musteri grubu, adres, urun, fiyat ve stok transaction icinde tekrar okundu.
- Stok satirlari depo koduna gore deterministik ayrildi ve optimistic update ile rezerve edildi.
- Siparis kalemlerinde urun/fiyat, sipariste adres/teslimat snapshot'i saklandi.
- Rezervasyonlar ayri ledger kayitlariyla siparis kalemine baglandi; stok ve siparis kalemi silmeleri `Restrict` tutuldu.
- Bayi siparis detayi company ownership ile, admin detayi permission ile sinirlandi.

## Test Kaniti

- Firma A kullanicisinin Firma B sepetini degistirememesi.
- Server fiyat kademesi ve iki stok satirina dagitilan rezervasyon.
- Ayni idempotency payload'inin tek siparis dondurmesi.
- Farkli payload ile ayni idempotency anahtarinin reddedilmesi.
- Yetersiz stokta siparis, rezervasyon ve kismi stok mutasyonunun rollback olmasi.

## Acik Riskler

- Siparis iptalinde rezervasyon release ve sevkiyat/teslimde consume akisi sonraki dilimde baglanacak.
- SQLite gelistirme ortami icin yeterli; canli ortam PostgreSQL'e alinmadan concurrency ve izolasyon testleri hedef veritabaninda tekrarlanacak.
- City Lojistik canli aktarimi, saglayicinin dogrulanmis API dokumani ve test hesabi olmadan aktif edilmeyecek.
