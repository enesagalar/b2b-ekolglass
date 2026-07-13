# EkolGlass Kurumsal Site ve Bagimsiz B2B Portal Siniri

Tarih: 2026-07-13

Durum: Onceki birlesik platform karari kullanici karariyla gecersiz kilindi.

## Karar

`www.ekolglass.com` mevcut hosting, sayfa yapisi, CMS ve admin paneliyle calismaya devam eder. Bu depo kurumsal siteyi yeniden kurmaz ve kurumsal sitenin veritabanini ya da yonetim panelini devralmaz.

B2B uygulamasi bagimsiz deploy edilen bir portal olarak yayinlanir. Calisma varsayimi `portal.ekolglass.com` adresidir; `b2b.ekolglass.com` secenegi DNS kurulumu oncesinde kesinlestirilecektir.

Kurumsal sitedeki tek zorunlu degisiklik, masaustu ve mobil navigasyonda gorunur bir `Bayi Portali` butonudur. Ana sayfa split-screen, gateway veya iki yol secim ekranina donusturulmez.

## Sistem Sinirlari

```text
www.ekolglass.com
|- mevcut kurumsal sayfalar
|- mevcut kurumsal CMS/admin
`- Bayi Portali butonu -> https://portal.ekolglass.com

portal.ekolglass.com
|- public urun kesfi ve bayi girisi
|- bayi katalog, teklif, siparis ve hesap alani
|- B2B uygulamasina ait /admin
`- B2B veritabani, CMS ayarlari ve entegrasyonlar
```

- Kurumsal site ile B2B uygulamasi ortak session veya cookie kullanmaz.
- Kurumsal admin ile B2B admin arasinda ortak yetkilendirme ya da yonetim ekrani yoktur.
- B2B CMS yalniz B2B portalina ait banner, katalog, duyuru ve operasyon ayarlarini yonetir.
- Kurumsal sitenin canonical, sitemap, legacy URL ve SEO davranisi degistirilmez.
- Portal aktivasyon, bayi ve admin rotalari `noindex` olur.

## Faz 3.5 Teslim Kapsami

1. Kesin portal hostunun secilmesi.
2. B2B uygulamasinin bagimsiz production ortamina alinmasi.
3. DNS, TLS, environment, backup ve rollback prosedurlerinin dogrulanmasi.
4. Kurumsal siteye masaustu ve mobil `Bayi Portali` butonunun eklenmesi.
5. Portal ile kurumsal site arasinda geri donus baglantilarinin kurulmasi.
6. B2B admin ve bayi route'larinin rol izolasyonunun E2E test edilmesi.
7. Portal robots/noindex ve sitemap sinirlarinin dogrulanmasi.
8. Ana site butonu, login, aktivasyon ve mobil gecis icin smoke testlerinin calistirilmasi.

## Kabul Kriterleri

- Mevcut kurumsal site ve admin kesintisiz calisir.
- Kurumsal sitedeki buton secilen HTTPS portal hostuna gider.
- B2B uygulamasi ve B2B admini bagimsiz deploy edilir.
- Bayi hesabi B2B admin alanina erisemez.
- Kurumsal ve B2B oturumlari birbirine sizmaz.
- Ortak CMS, ortak medya kutuphanesi veya ortak veritabani kabul edilmis varsayim degildir.
- Ana site, portal ve admin gecisleri masaustu ve mobil E2E testleriyle kanitlanir.

## Acik Kararlar

- Kesin host: `portal.ekolglass.com` veya `b2b.ekolglass.com`.
- B2B admini portal altinda `/admin` olarak mi, ayri bir admin subdomaininde mi yayinlanacak?

Varsayilan teknik yon: `portal.ekolglass.com` B2B uygulamasi, `portal.ekolglass.com/admin` B2B operasyon paneli.
