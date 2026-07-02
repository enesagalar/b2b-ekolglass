# Research Note - B2B Portal, CMS ve Kargo Entegrasyonu

Tarih: 2026-07-02

## Sonuc

EkolGlass icin en dogru yon, tek parca demo uygulama degil; ayrilmis ama ayni veri modeli uzerinde calisan su mimaridir:

- Public site: kurumsal sayfalar, SEO, genel katalog vitrinleri.
- Dealer portal: bayi girisi, fiyat, teklif, siparis, sevkiyat ve cari akislar.
- Admin/CMS: icerik, urun, bayi, fiyat, siparis ve operasyon yonetimi.
- Integration layer: ERP/MES, kargo, bildirim, e-fatura ve muhasebe adapterleri.
- Audit/logging: kritik islem ve entegrasyon denemeleri icin degistirilemez kayit.

## CMS Secenekleri

### Payload CMS

Payload, Next.js ve TypeScript ile dogal uyumlu, code-first bir CMS ve app framework. Resmi dokumanlarda config uzerinden fields, localization, authentication ve access control tanimlanabildigi belirtiliyor. Access control fonksiyonlariyla kullanici rollerine gore yetki ayrimi yapilabiliyor.

Karar: Next.js tabanli EkolGlass mimarisi icin birinci aday.

Kaynaklar:

- https://payloadcms.com/docs/configuration/overview
- https://payloadcms.com/docs/access-control/overview
- https://payloadcms.com/docs/configuration/localization
- https://payloadcms.com/docs/getting-started/installation

### Strapi

Strapi 5; admin panel, content manager, RBAC, users-permissions, i18n, media library, review workflows ve audit logs gibi hazir CMS kabiliyetleri sunuyor. Icerik ekibi oncelikliyse guclu alternatif. Audit logs ve bazi kurumsal ozelliklerin lisans/plana bagli olabilecegi ayrica kontrol edilmeli.

Kaynaklar:

- https://docs.strapi.io/cms/features/admin-panel
- https://docs.strapi.io/cms/features/rbac
- https://docs.strapi.io/cms/features/content-manager
- https://docs.strapi.io/cms/features

### Directus

Directus, var olan SQL veritabani ustune no-code data studio ve REST/GraphQL API saglayan guclu bir secenek. Veri merkezi yaklasim istenirse degerli; ancak is mantigi karmasiklastikca custom extension disiplini gerekir.

Kaynak:

- https://directus.com/

## B2B Commerce Referanslari

Shopify B2B ve BigCommerce B2B dokumanlari su kavramlari dogruluyor:

- Sirket/company bazli musteri yapisi.
- Company location / adres / contact permission ayrimi.
- Catalog ve price list atamalari.
- Payment terms ve draft order / approval akislar.
- Quote, sales rep ve company management API ihtiyaci.

Kaynaklar:

- https://help.shopify.com/en/manual/b2b/getting-started/features
- https://help.shopify.com/en/manual/b2b/companies-and-customers/creating-companies
- https://help.shopify.com/en/manual/b2b/checkout-and-orders/payment-methods
- https://docs.bigcommerce.com/developer/api-reference/rest/b2b/overview

## City Lojistik / Kargo

City Lojistik icin kamuya acik, dogrulanabilir Turkiye API dokumani bulunamadi. City Lojistik'in kendi sitesinde lojistik hizmetleri ve operasyonel kapsam anlatiliyor; ayrica statuspage mevcut. Bu nedenle canlı endpoint uydurulmadi.

Karar:

- `ShippingProviderAdapter` sozlesmesi kuruldu.
- City Lojistik adapter pasif baslar.
- Canli entegrasyon icin musteri API dokumani, test endpointi, auth tipi, cari/musteri kodu ve webhook/etiket destek bilgisi gerekir.

Kaynaklar:

- https://citylojistik.com/
- https://citylojistik.statuspage.io/

## Uygulama Karari

Kisa vadede Next.js + Prisma ile operasyonel cekirdek guclendirilecek. CMS icin Payload aday olarak dokumante edildi; direkt kuruluma gecmeden once auth stratejisi, Postgres gecisi ve admin subdomain karari netlestirilecek.
