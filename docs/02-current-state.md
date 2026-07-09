# Guncel Proje Durumu

Son guncelleme: 2026-07-03

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `e4d665e Document admin UX roadmap and security gates`
  - `d8f8584 Add admin product catalog management`
  - `ac88f85 Add database-backed admin authentication`

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
- Admin urun detay sayfasi.
- Admin urun detayinda stok/fiyat guncelleme formlari.
- Admin urun detayinda medya/teknik dosya ekleme ve guncelleme.
- Public katalog arama/filtre.
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi ve firma operasyonu eksik:
   - Bayi basvurusu inceleme/onay ekrani yok.
   - Onaydan firma ve bayi kullanicisi uretme yok.
   - Firma bazli fiyat gorunurlugu yok.

2. Urun yonetimi ilerledi ama bazi operasyonlar tamamlanmadi:
   - Uyumluluk/OEM ekleme UI'i yok.
   - Medya kayitlari icin silme/pasife alma karar modeli yok.
   - Kategori/fiyat listesi yan panelleri ayri alt ekrana bolunmedi.
   - Bayi rolune gore fiyat/stok gorunurlugu yok.

3. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 3.1 devam edecek: Urun ve Katalog UX Iyilestirme.

Admin urun detay sayfasi stok, fiyat ve medya icin duzenleme merkezi olmaya basladi. Siradaki adim, bayi rolune gore katalog fiyat/stok gorunurlugunu ve uyumluluk/OEM ekleme akisini tamamlamaktir.

Hedef ekranlar:

- bayi rolune gore katalog fiyat/stok gorunurlugu
- `/admin/urunler/[id]` uyumluluk/OEM ekleme
- kategori/fiyat listesi alt ekranlari
