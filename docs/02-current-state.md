# Guncel Proje Durumu

Son guncelleme: 2026-07-10

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `d6a5666 Split product category and price list admin screens`
  - `bc4625d Add media soft deactivation workflow`
  - `2934cc0 Enforce catalog price and stock visibility`
  - `68bf9a7 Add product compatibility management and advisor reports`
  - `4ead9a0 Add codex fleet operating guide`

## Calisan Temel Parcalar

- Next.js App Router uygulamasi.
- Prisma 7 + SQLite lokal veritabani.
- Seed verisi.
- Admin login:
  - `admin@ekolglass.local`
  - lokal fallback sifre: `EkolGlass2026!`
- DB session ve httpOnly cookie.
- Admin route guard.
- Audit log modeli ve kritik admin action loglari.
- Public ana sayfa.
- Public katalog.
- Bayi basvuru formu.
- Admin bayi basvurusu liste/detay ekranlari.
- Permission kontrollu bayi inceleme ve durum gecis akisi.
- Onaydan transaction tabanli firma ve `DEALER_OWNER/INVITED` kullanici uretimi.
- Musteri grubu, odeme kosulu ve kredi limiti atamasi.
- Admin dashboard temeli.
- Admin shell:
  - Sol menu
  - Ust bar
  - Mobil menu
  - Operasyon dashboard
- Admin CMS ayar ekrani.
- Admin urun/kategori/fiyat/stok yonetimi.
- Admin urun liste arama/filtre/sayfalama.
- Admin kategori yonetimi alt ekrani: `/admin/urunler/kategoriler`.
- Admin fiyat listesi alt ekrani: `/admin/urunler/fiyat-listeleri`.
- Admin urun detay sayfasi.
- Admin urun detayinda stok/fiyat guncelleme formlari.
- Admin urun detayinda medya/teknik dosya ekleme ve guncelleme.
- Admin urun detayinda medya/teknik dosya soft aktif/pasif yonetimi.
- Admin urun detayinda uyumluluk/OEM ekleme ve guncelleme.
- Admin urun detayinda uyumluluk/OEM duplicate engeli ve audit log'lu silme.
- Public katalog arama/filtre.
- Public katalogda role-based fiyat/stok gorunurlugu.
- Public katalogda OEM/uyumluluk kayitlari uzerinden arama.
- Catalog server action testleri:
  - Uyumluluk duplicate engeli
  - Uyumluluk silme sahiplik kontrolu
  - Uyumluluk audit/revalidation
- Arka plan Codex advisor rapor hatti:
  - `scripts/codex-advisor.ps1`
  - `docs/agent-reports/`
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi kabul akisi eksik:
   - Davet/aktivasyon token ve ilk sifre belirleme akisi yok.
   - `/admin/firmalar` liste/detay ve kullanici yonetimi yok.
   - Gercek bayi oturumu ile firma bazli fiyat gorunurlugu testi yok.

2. Urun yonetimi ilerledi ama bazi operasyonlar tamamlanmadi:
   - Firma bazli fiyat gorunurlugu UI'da basladi; bayi firma/onay akisi eksik oldugu icin gercek bayi testleri sonraki faza kaldi.

3. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 3.2 devam edecek: Bayi Aktivasyonu, Firma Yonetimi ve Izolasyon Testleri.

Admin bayi basvurusu liste/detay, permission kontrollu durum yonetimi ve onaydan atomik firma/kullanici uretimi tamamlandi. Kullanici guvenli varsayimla `INVITED` ve parolasiz olusuyor. Siradaki adim tek kullanimlik aktivasyon token'i, ilk sifre belirleme ekrani ve gercek bayi oturumuyla firma/fiyat izolasyon testidir.

Siradaki hedef ekranlar:

- `/aktivasyon/[token]`
- `/admin/firmalar`
- `/admin/firmalar/[id]`
