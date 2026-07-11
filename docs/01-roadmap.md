# Faz Yol Haritasi

## Faz 1 - Temel Platform

Durum: Tamamlandi.

Kapsam:

- Next.js App Router, TypeScript, Tailwind temeli.
- Prisma/SQLite gelistirme veritabani.
- Rol, izin ve durum sabitleri.
- Bayi basvuru formu.
- Katalog onizleme ekrani.
- Admin dashboard ve banner icerik yonetimi ekrani.
- Ilk seed verisi ve domain testleri.

Cikis kriteri:

- `npm run lint`, `npm run test`, `npm run build` basarili.
- Prisma client uretilebilir.
- Ilk migration ve seed akisi calisir.

## Faz 2 - Gercek Auth ve Admin Korumasi

Durum: Kismen tamamlandi.

Kapsam:

- Guvenli oturum sistemi.
- Sifre hashleme, password reset hazirligi.
- Admin route guard.
- Firma bazli veri erisim kisitlari.
- Audit log yazimi.

Eksik kalanlar:

- Password reset akisi.
- Auth/session entegrasyon testleri.

## Faz 2.5 - Admin UX Shell ve Operasyon Merkezi

Durum: Tamamlandi.

Kapsam:

- Kalici sol admin menusu.
- Ust bar: aktif kullanici, hizli arama, bildirim/uyari alani.
- Dashboard operasyon merkezi.
- Modul kartlari yerine gercek is akis panelleri.
- Bekleyen bayi, dusuk stok, acik teklif, yeni siparis, sevkiyat ve audit akislarini tek ekranda gostermek.
- Admin route yapisini tek layout altinda toparlamak.

Cikis kriteri:

- `/admin` profesyonel operasyon paneli gibi hissedilir.
- Tum admin ekranlari ayni shell, sidebar ve sayfa basligi duzenini kullanir.
- Dashboard verisi DB'den gelir ve bos durumlari duzgun tasarlanir.
- Mobil/tablet/desktop kirilimlari bozulmaz.

Tamamlananlar:

- Ortak admin shell.
- Sol sidebar.
- Mobil menu.
- Ust bar ve kullanici/rol alani.
- Dashboard operasyon merkezi.
- `/admin/urunler` ve `/admin/icerik` shell icine alindi.

## Faz 3 - Urun ve Katalog Operasyonu

Durum: Faz 3.1 ve Faz 3.2 temel kapsami tamamlandi.

Kapsam:

- Urun CRUD.
- Kategori yonetimi.
- Teknik dosya/gorsel modeli.
- Arama, filtre ve sayfalama.
- Stok gorunurluk kurallari.

Tamamlananlar:

- Urun, kategori, fiyat listesi, fiyat ve stok icin admin CRUD/upsert temeli.
- Validation ve helper testleri.
- Audit log yazimi.
- Urun liste arama/filtre/sayfalama.
- Urun detay sayfasi ve sekmeli UX.
- Medya/teknik dosya yonetimi.
- Bayi rolune gore fiyat gorunurlugu.
- Public katalog arama ve filtreleme.
- Kategori ve fiyat listesi alt ekranlari.
- Medya soft aktif/pasif karar modeli.
- Uyumluluk/OEM duplicate/delete karar modeli.
- Bayi basvurusu admin liste/detay ve inceleme akisi.
- Onaydan transaction tabanli firma ve davet bekleyen bayi sahibi uretimi.
- Musteri grubu, odeme kosulu, kredi limiti ve audit kaydi.
- Permission, optimistic concurrency ve cakisma kontrolleri.
- Tek kullanimlik bayi aktivasyonu ve ilk parola belirleme.
- Admin firma liste/detay ve kullanici davet yonetimi.
- DB seviyesinde firma/grup fiyat izolasyonu.
- Merkezi ACTIVE dealer + APPROVED company context DAL.
- Bayi operasyon dashboard, siparis, teklif ve firma hesap ekranlari.
- DB seviyesinde order/quote tenant izolasyonu ve SQLite testi.
- Dealer portal operasyon sorgu indeksleri.

Eksik kalanlar:

- Transactional e-posta teslim adapteri.
- Authenticated katalogun bayi shell icinde ortak bilesene alinmasi.
- Teklif/siparis detay ve olusturma action tenant izolasyonu.
- Liste filtreleri ve sayfalama.

## Faz 3.3 - Dealer Context ve Bayi Operasyon Portali

Durum: Ilk dilim tamamlandi; detay ve olusturma akislari devam ediyor.

Tamamlananlar:

- `/bayi` responsive operasyon shell ve dashboard.
- `/bayi/siparisler`, `/bayi/teklifler`, `/bayi/hesabim`.
- Session kaynakli merkezi company context.
- Company-scoped order, quote ve shipment sorgulari.
- Cross-company entegrasyon testi ve HTTP smoke kapsami.
- Mobil kompakt operasyon listeleri.

Referans:

- `docs/phases/phase-03-3-dealer-context-dashboard.md`

## Faz 3.5 - Birlesik Kurumsal Site, B2B Gateway ve CMS

Durum: Mimari hedef tanimlandi; implementasyon baslamadi.

Kapsam:

- `www.ekolglass.com` marka gateway ve kurumsal site.
- `portal.ekolglass.com` B2B yuzeyi.
- Tek admin/CMS, medya kutuphanesi ve veritabani.
- Site/locale/path kapsamli Page ve SiteSetting modeli.
- Navigation, redirect, SEO, preview, publish ve revision akislari.
- Mevcut `.html`, `/en/**` ve anchor URL'leri icin SEO redirect plani.

Mimari referans:

- `docs/architecture/unified-web-b2b-cms.md`

## Faz 4 - Teklif ve Siparis Akisi

Kapsam:

- Teklif sepeti.
- Ozel olcu ve dosya upload.
- Teklif durum yonetimi.
- Tekliften siparise donusum.
- Siparis durum gecmisi.

## Faz 5 - Fiyat, Raporlama ve Entegrasyon Hazirligi

Kapsam:

- Musteri grubu ve firma bazli fiyat listeleri.
- Satis raporlari.
- Bildirim altyapisi.
- ERP/MES entegrasyon servis sinirlari.
