# Guncel Proje Durumu

Son guncelleme: 2026-07-10

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `d6a5666 Split product category and price list admin screens`
  - `2934cc0 Enforce catalog price and stock visibility`
  - `68bf9a7 Add product compatibility management and advisor reports`
  - `4ead9a0 Add codex fleet operating guide`
  - `069ffdf Move product operations into detail tabs`

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
- Public katalog arama/filtre.
- Public katalogda role-based fiyat/stok gorunurlugu.
- Arka plan Codex advisor rapor hatti:
  - `scripts/codex-advisor.ps1`
  - `docs/agent-reports/`
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi ve firma operasyonu eksik:
   - Bayi basvurusu inceleme/onay ekrani yok.
   - Onaydan firma ve bayi kullanicisi uretme yok.
   - Firma bazli fiyat gorunurlugu yok.

2. Urun yonetimi ilerledi ama bazi operasyonlar tamamlanmadi:
   - Firma bazli fiyat gorunurlugu UI'da basladi; bayi firma/onay akisi eksik oldugu icin gercek bayi testleri sonraki faza kaldi.
   - Uyumluluk/OEM kayitlari icin duplicate/delete karar modeli yok.

3. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 3.1 devam edecek: Urun ve Katalog UX Iyilestirme.

Admin urun detay sayfasi stok, fiyat, medya ve uyumluluk/OEM icin duzenleme merkezi olmaya basladi. Public katalogda fiyat/stok gorunurlugu role gore ayrildi. Kategori ve fiyat listesi yonetimi alt ekranlara ayrildi. Medya icin soft aktif/pasif karar modeli tamamlandi. Siradaki adim, uyumluluk duplicate/delete ve test modelini netlestirmektir.

Hedef ekranlar:

- uyumluluk duplicate/delete ve test modeli
