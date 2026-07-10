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
   - Bayi basvurusu admin liste/detay ekrani yok.
   - Basvurudan firma uretme akisi yok.
   - Basvurudan bayi kullanicisi uretme akisi yok.
   - Customer group, payment terms ve credit limit atamasi yok.
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

Faz 3.2 baslayacak: Bayi Basvurusu, Firma ve Kullanici Akisi.

Admin urun detay sayfasi stok, fiyat, medya ve uyumluluk/OEM icin duzenleme merkezi oldu. Public katalogda fiyat/stok gorunurlugu role gore ayrildi. Kategori ve fiyat listesi yonetimi alt ekranlara ayrildi. Medya icin soft aktif/pasif, uyumluluk/OEM icin duplicate/delete karar modeli tamamlandi. Siradaki adim, bayi basvurusunu admin onay ve firma/kullanici uretim akisina baglamaktir.

Hedef ekranlar:

- `/admin/bayi-basvurulari`
- `/admin/bayi-basvurulari/[id]`
