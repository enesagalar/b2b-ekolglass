# Faz 3.3 - Dealer Context ve Bayi Operasyon Portali

Durum: Devam ediyor - portal, ticaret, transactional e-posta ve entegrasyon operasyon dilimleri tamamlandi.

## Hedef

Onayli bir firmaya bagli aktif bayi kullanicisinin yalnizca kendi firmasinin operasyon verilerini gordugu, gercek veritabani sorgulariyla calisan bayi portalini kurmak.

## Tamamlanan Ilk Dilim

- `requireDealerContext` ile ACTIVE dealer + APPROVED company kosulu tek DAL'da toplandi.
- Tenant kimligi URL veya formdan degil, sunucu oturumundan turetiliyor.
- Bayi login yonlendirmesi UX/IA konsolidasyonu sonrasinda `/` ticaret ana sayfasi olarak sabitlendi.
- `/bayi` operasyon dashboardu eklendi.
- `/bayi/siparisler`, `/bayi/teklifler` ve `/bayi/hesabim` eklendi.
- Sol menulu responsive bayi shell eklendi.
- Siparis, teklif ve sevkiyat sorgulari DB seviyesinde `companyId` ile sinirlandi.
- Firma A/Firma B izolasyonu gercek SQLite entegrasyon testiyle dogrulandi.
- Order, quote, address, item ve shipment sorgu indeksleri migration ile eklendi.
- Guest `/bayi`, admin `/bayi`, dealer login ve tum bayi ekranlari HTTP smoke test kapsaminda.
- Mobil listeler yatay tablo yerine kompakt operasyon satirlari gosteriyor.

## Veri Dogrulugu Karari

- `Company.creditLimit` ve `paymentTerms` gercek kayittan gosterilir.
- Cari bakiye, gecikmis bakiye veya kullanilabilir limit mevcut modelden tahmin edilmez.
- Bu alanlar ileride ERP kaynakli salt okunur `CompanyFinancialSnapshot` benzeri bir modelle eklenir.
- City Lojistik pasifken sahte takip durumu uretilmez.

## Guvenlik Invariantlari

1. Dealer tenant kimligi istemci girdisinden alinmaz.
2. Her dealer order/quote sorgusu DB seviyesinde `companyId` kosulu tasir.
3. Firma APPROVED durumundan ciktiginda mevcut session olsa da sonraki portal istegi kapanir.
4. Dealer sonucunda `internalNotes`, entegrasyon raw payload veya admin ozel alanlari secilmez.
5. Ayni musteri grubundaki firmalar fiyat listesi paylasabilir; siparis, teklif ve sevkiyat paylasamaz.

## Siradaki Dilim

1. Login rate-limit e-posta + IP anahtarli, indeksli modele tasinacak.
2. Siparis ve teklif liste sayfalama/filtreleri tamamlanacak.
3. Production SMTP scheduler, alarm kanali ve secret rotasyon runbook'u yazilacak.
4. City Lojistik canli API sozlesmesi geldikten sonra provider mapping uygulanacak.

## Tamamlanan Teklif Talebi Dilimi

- Authenticated urunler bayi shell icinde `/bayi/urunler` ve `/bayi/urunler/[id]` olarak calisiyor.
- Sepet, gonderilmis teklif kaydindan ayrilan `QuoteCart`/`QuoteCartItem` modellerini kullaniyor.
- Sepet tenant siniri `companyId + ownerUserId` unique anahtariyla korunuyor.
- Gonderimde istemci fiyati kabul edilmiyor; aktif fiyatlar ayni `pricedAt` aninda yeniden cozuluyor.
- Firma, musteri grubu, public scope; priority ve miktar kademesi deterministik seciliyor.
- Teklif, kalem snapshot'lari, audit log ve sepet tuketimi tek transaction icinde.
- Idempotency anahtari ayni gonderimin iki teklif uretmesini engelliyor.
- Teklif detayi her zaman `id + companyId` ile okunuyor; internal notlar bayi DTO'suna girmiyor.

## Tamamlanan Entegrasyon Operasyon Dilimi

- `/admin/entegrasyonlar` yalniz `integration.read` yetkisiyle erisilebilir.
- Replay islemleri ayri `integration.replay` yetkisi, stale-state CAS ve idempotent command ledger ile korunur.
- `DEAD` olaylar gerekceyle yeniden acilir; `RETRY` olaylar attempt ve son hata kanitini kaybetmeden erkene alinir.
- Admin DTO'su payload, lock tokeni ve ham provider cevabini secmez.
- Backlog, dead-letter, expired lease ve isleyicisiz topic health durumunu `degraded` yapar.
- Admin shell tum ic rollerde permission bazli menu uretir.

## Kabul Durumu

- Lint: basarili.
- Test: 31 dosya, 143 test basarili.
- Production build: basarili.
- HTTP smoke: urun detay ve teklif sepeti dahil basarili.
- Browser QA: login -> urun detay -> 2 adet sepet -> teklif sonucu desktop/mobile basarili; body overflow yok.
- Entegrasyon QA: admin entegrasyon rotasi, permission-aware menu ve 390x844 responsive yerlesim dogrulandi.
