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
- Dealer portal route guard.
- Firma bazli veri izolasyonu testleri.
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

Durum: Faz 3.1 tamamlandi, Faz 3.2 devam ediyor.

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

Eksik kalanlar:

- Bayi davet/aktivasyon ve ilk sifre belirleme akisi.
- Admin firma/kullanici yonetimi.
- Gercek bayi oturumu ile firma/fiyat izolasyonu testleri.

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
