# ADR 0001 - Portal, Admin/CMS ve Entegrasyon Katmanlarini Ayirma

Durum: Kabul edildi

## Baglam

EkolGlass B2B sistemi sadece katalog gosteren bir site degildir. Bayi onayi, firma bazli fiyat, stok gorunurlugu, teklif, siparis, sevkiyat, raporlama ve ERP/MES hazirligi gerekir.

Tek Next.js sayfalari icinde her seyi cozmek, kisa vadede hizli gorunur ama uzun vadede admin, bayi ve entegrasyon is mantigini birbirine baglar.

## Karar

Sistem mantiksal olarak dort parcaya ayrilir:

1. Public site: kurumsal icerik, SEO, genel katalog.
2. Dealer portal: bayi girisi, fiyat, teklif, siparis, takip.
3. Admin/CMS: icerik, urun, bayi, fiyat, operasyon, dashboard.
4. Integration layer: kargo, ERP/MES, bildirim, fatura, muhasebe adapterleri.

Tek repo icinde baslanabilir, fakat route ve domain sinirlari ayrilir:

- `/` ve public rotalar
- `/portal/*` bayi operasyonu
- `/admin/*` operasyon admini
- gelecekte `admin.ekolglass.com` ve `portal.ekolglass.com`

## Sonuclar

- Admin ekranlari role gore dashboard mantigiyle tasarlanir.
- CMS verisi `Page`, `PageBlock`, `MediaAsset`, `SiteSetting` modellerine ayrilir.
- Kargo entegrasyonlari `ShippingProviderAdapter` sozlesmesini uygular.
- Audit log ve integration log ana mimarinin parcasi olur.
- City Lojistik gibi entegrasyonlar API dogrulanmadan sahte endpoint ile yazilmaz.
