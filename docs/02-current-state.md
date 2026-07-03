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
- Public katalog arama/filtre.
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi ve firma operasyonu eksik:
   - Bayi basvurusu inceleme/onay ekrani yok.
   - Onaydan firma ve bayi kullanicisi uretme yok.
   - Firma bazli fiyat gorunurlugu yok.

2. Urun yonetimi ilerledi ama operasyon formlari daginik:
   - Medya/teknik dosya ekleme UI'i yok.
   - Stok/fiyat guncelleme formlari detay sayfasina tasinmadi.
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

Admin urun listesi ve public katalog filtreleri tamamlandi. Siradaki adim, urun detay sayfasini gercek duzenleme merkezi haline getirmek ve medya/teknik dosya yonetimini tamamlamaktir.

Hedef ekranlar:

- `/admin/urunler/[id]`
- medya/teknik dosya yonetimi
- bayi rolune gore katalog fiyat/stok gorunurlugu
