# Faz 3.3 - Dealer Context ve Bayi Operasyon Portali

Durum: Devam ediyor - ilk dilim tamamlandi.

## Hedef

Onayli bir firmaya bagli aktif bayi kullanicisinin yalnizca kendi firmasinin operasyon verilerini gordugu, gercek veritabani sorgulariyla calisan bayi portalini kurmak.

## Tamamlanan Ilk Dilim

- `requireDealerContext` ile ACTIVE dealer + APPROVED company kosulu tek DAL'da toplandi.
- Tenant kimligi URL veya formdan degil, sunucu oturumundan turetiliyor.
- Bayi login yonlendirmesi `/bayi` olarak degistirildi.
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

1. Authenticated katalog bayi shell icinde ortak katalog bileseniyle acilacak.
2. Siparis ve teklif liste sayfalama/filtreleri eklenecek.
3. Company-scoped siparis ve teklif detay sayfalari eklenecek.
4. Teklif talebi ve taslak siparis olusturma akislarina gecilecek.
5. `QuoteRequest.requestedById` ve gercek delivery address relation sema sertlestirmesi planlanacak.
6. Transactional aktivasyon e-posta adapteri uygulanacak.

## Kabul Durumu

- Lint: basarili.
- Test: 10 dosya, 51 test basarili.
- Production build: basarili.
- HTTP smoke: dealer dashboard ve alt ekranlar dahil basarili.
- Browser QA: desktop/mobile body overflow yok; konsol warning/error yok.
