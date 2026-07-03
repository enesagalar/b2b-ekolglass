# Guncel Proje Durumu

Son guncelleme: 2026-07-03

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `d8f8584 Add admin product catalog management`
  - `ac88f85 Add database-backed admin authentication`
  - `5c704e4 Build EkolGlass B2B portal foundation`

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
- Admin CMS ayar ekrani.
- Admin urun/kategori/fiyat/stok yonetimi.
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Admin UX shell eksik:
   - Sol menu yok.
   - Tek admin layout yok.
   - Dashboard operasyon merkezi gibi degil.

2. Bayi ve firma operasyonu eksik:
   - Bayi basvurusu inceleme/onay ekrani yok.
   - Onaydan firma ve bayi kullanicisi uretme yok.
   - Firma bazli fiyat gorunurlugu yok.

3. Urun yonetimi baslatildi ama UX ham:
   - Liste arama/filtre yok.
   - Detay sayfasi yok.
   - Sekmeli urun duzeni yok.
   - Medya/teknik dosya yok.

4. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

5. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 2.5 uygulanacak: Admin UX Shell ve Operasyon Merkezi.

Bu faz yeni is mantigi eklemekten cok, mevcut admin deneyimini profesyonel bir B2B operasyon paneline cevirecek.

Hedef ekranlar:

- `/admin` dashboard
- `/admin/urunler`
- `/admin/icerik`

Bu ekranlar tek shell altina alinacak.
