# Commerce UX ve Bilgi Mimarisi

Son guncelleme: 2026-07-13

## Kalici Kararlar

- `/` kurumsal web ile e-ticaret urun kesfini birlestiren ana ekrandir.
- Guest ve bayi ayni ana sayfayi kullanir; header, CTA ve hesap alanlari oturuma gore degisir.
- `/urunler` ortak ticaret alanidir. Guest fiyat gormez; onayli bayi ayni rotada firma fiyatini ve teklif/siparis islemlerini gorur.
- `/bayi/urunler` eski baglantilar icin `/urunler`e kalici yonlenir.
- `/teklif-sepeti` urun kesfi sirasinda olusan teklif sepetidir; `/bayi/teklif-sepeti` bu rotaya kalici yonlenir.
- `/bayi` alisveris baslatilan yer degil, teklif/siparis/sevkiyat takibinin yapildigi hesap ve operasyon merkezidir.
- `/katalog` eski baglantilar icin sorgu parametrelerini koruyarak `/urunler`e kalici yonlenir.
- Aktivasyon sonrasi bayi `/giris`, basarili giris sonrasi `/` ekranina gelir.
- Public `/giris` yalnizca bayi rollerini kabul eder.
- Ic ekip girisi `/yonetim/giris` altinda ayridir; public navigasyonda yer almaz ve noindex'tir.
- `/admin`, `/bayi`, giris, aktivasyon ve API rotalari sitemap'e girmez.
- Admin erisiminin navigasyonda gizlenmesi bir guvenlik siniri degildir. Rol kontrolu, session guard ve noindex birlikte uygulanir; canli ortamda MFA ve gerekirse ag/IP politikasi ayrica ele alinacaktir.

## Ana Kullanici Akislari

1. Ziyaretci `/` uzerinden urun arar ve `/urunler`e gider.
2. Fiyat veya bayi islemi gerektiginde `/giris` ya da `/bayi-basvurusu`na yonelir.
3. Onaylanan basvuru aktivasyonla parola olusturur, bayi girisi yapar ve `/`e doner.
4. Oturum acik header firma kimligini, hesap merkezini ve sepetleri gosterir; urun islemleri `/urunler` ve urun detayindan baslar.
5. Bayi siparis verdikten sonra `/bayi` ve `/bayi/siparisler` uzerinden durumu takip eder.
6. Ic ekip public bayi girisini kullanamaz; ayri yonetim girisiyle `/admin`e erisir. Admin public siteyi gezerken bayi fiyati ve bayi aksiyonu goremez.

## CMS Siniri

Ana banner basligi, aciklamasi, CTA metni ve hero medya kaydi veritabanindan yonetilir. Admin icerik ekranindan banner gorseli ve alternatif metni guncellenebilir. Navigasyon, coklu banner zamanlamasi ve sayfa bloklari sonraki CMS dilimlerinde modele tasinacaktir.

## SEO ve Sitemap

Sitemap yalnizca `/`, `/urunler` ve `/bayi-basvurusu` rotalarini listeler. Robots kurallari ozel alanlari dislar. Canonical host canli ortamda `NEXT_PUBLIC_SITE_URL` ile verilecektir.
