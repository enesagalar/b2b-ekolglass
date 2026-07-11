# Birlesik EkolGlass Web, B2B ve CMS Mimarisi

Tarih: 2026-07-11

## Urun Vizyonu

EkolGlass tek bir dijital platform olarak yonetilecek. Ziyaretci ana alan adina geldiginde iki ana yolu ayni marka deneyiminde gorecek:

1. Kurumsal site: cozumler, uretim, katalog, galeri, hakkimizda, iletisim ve teklif.
2. B2B portal: bayi girisi, firma katalog/fiyatlari, teklifler, siparisler, stok ve sevkiyat.

Her iki yuzey ayni admin paneli, CMS, medya kutuphanesi, kullanici sistemi ve veritabani tarafindan yonetilecek.

## Hedef Alan Adi ve Route Modeli

```text
www.ekolglass.com
|- /                       Marka gateway + indekslenebilir faaliyet ozeti
|- /kurumsal               Kurumsal ana sayfa
|- /cozumler
|- /cozumler/[slug]
|- /uretim
|- /e-katalog              Kurumsal katalog
|- /galeri
|- /hakkimizda
|- /iletisim
`- /teklif

portal.ekolglass.com
|- /                       Bayi portal dashboard
|- /giris
|- /katalog                Firma/fiyat kontrollu B2B katalog
|- /teklifler
|- /siparisler
`- /sevkiyatlar

Ayni uygulama icinde ilk asama
`- /admin                  Ortak CMS ve operasyon paneli
```

`admin.ekolglass.com` ileride ayrilabilir. Ilk geciste mevcut `/admin` cookie ve auth sinirini tasimamak daha dusuk risklidir.

## Gateway Tasarim Karari

- Koku yalniz iki buyuk butondan olusan bos bir secim ekrani yapmayacagiz.
- Ilk viewportta EkolGlass markasi, gercek uretim/cam gorseli ve iki belirgin yol olacak.
- Kurumsal yol "EkolGlass'i ve uretim cozumlerini kesfet" amacini tasiyacak.
- B2B yol "Bayi girisi, fiyat, teklif ve siparis operasyonu" amacini tasiyacak.
- Kisa marka/faaliyet ozeti indekslenebilir kalacak; mevcut ana sayfanin SEO konu otoritesi tamamen kaybedilmeyecek.
- Mobilde iki yol sirali ve tam okunabilir olacak; masaustunde iki yuzey ayni sahneyi paylasacak.

## Canli Site Icerik Envanteri

2026-07-11 tarihinde `www.ekolglass.com` uzerinde gorulen ana icerik alanlari:

- "Camin Ekolu" marka mesaji.
- Otomobil, otobus, karavan, yat ve ozel uretim cozumleri.
- Uretim gucu ve proses anlatimi.
- E-katalog ve PDF katalog.
- Fabrika videosu ve galeri.
- Teklif ve iletisim akislari.
- Turkce ve Ingilizce yuzeyler.

Bu icerikler yeniden yazilmadan once mevcut URL, medya, form hedefi, analytics ve Search Console envanteri alinacak.

## CMS Hedefi

Mevcut `Page`, `PageBlock`, `PageRevision`, `MediaAsset` ve `SiteSetting` modelleri additive migration ile genisletilecek:

- `siteKey/channel`, locale ve tam path.
- Sayfa tipi, template ve parent/navigation yapisi.
- Canonical, robots, OG gorseli, hreflang ve structured data.
- Menu, footer, redirect ve reusable content modelleri.
- Tum aktif bloklari render eden blok registry.
- Preview, publish/unpublish, revision restore ve planli yayin.
- Medya MIME, boyut, storage key/provider, focal point ve varyant bilgileri.
- Site/locale kapsamli ayarlar.

Mevcut tablolar yikici sekilde yeniden adlandirilmayacak; once yeni alanlar eklenip veri tasinacak.

## SEO ve Cutover Kurallari

- `www` ve apex alan adlarindan biri canonical secilecek; digeri 308 yonlendirilecek.
- `hakkimizda.html`, `teklifal.html`, `katalog.html`, cozum sayfalari ve `/en/**` icin birebir redirect haritasi cikacak.
- Mevcut `/#services`, `/#production`, `/#catalog`, `/#gallery`, `/#contact` anchor hedefleri gecis boyunca korunacak.
- Kurumsal sayfalar sitemap'e girecek; portal, aktivasyon ve admin `noindex` olacak.
- Mevcut `/katalog` B2B sozlesmesi cutover oncesi degistirilmeyecek.
- Kök gateway, redirectler, canonical, sitemap ve robots ayni release icinde acilacak.

## Fazli Uygulama

1. URL, SEO, medya, form ve analytics envanteri.
2. Additive CMS schema ve navigation/redirect modelleri.
3. CMS renderer, preview, publish ve medya yonetimi.
4. Kurumsal icerigin `/kurumsal/**` altinda paralel kurulumu.
5. B2B route'larinin portal host sozlesmesine hazirlanmasi.
6. Gateway ve legacy redirect cutover'u.
7. 404, canonical, index coverage ve form conversion izlemesi.

## Acik Kararlar

- Canonical host `www.ekolglass.com` mu, `ekolglass.com` mu olacak?
- B2B kesin hedefi `portal.ekolglass.com` mu, `b2b.ekolglass.com` mu olacak?
- Kurumsal sitenin mevcut hosting ve medya dosyalari nasil devralinacak?
- Transactional e-posta saglayicisi hangisi olacak?

Varsayilan teknik yon: `www` gateway/kurumsal, `portal` B2B, `/admin` ortak yonetim.
