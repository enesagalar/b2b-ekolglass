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
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi ve firma operasyonu eksik:
   - Bayi basvurusu inceleme/onay ekrani yok.
   - Onaydan firma ve bayi kullanicisi uretme yok.
   - Firma bazli fiyat gorunurlugu yok.

2. Urun yonetimi baslatildi ama UX ham:
   - Liste arama/filtre yok.
   - Detay sayfasi yok.
   - Sekmeli urun duzeni yok.
   - Medya/teknik dosya yok.

3. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 3.1 uygulanacak: Urun ve Katalog UX Iyilestirme.

Admin shell tamamlandi. Siradaki adim, urun operasyonunu ham CRUD ekranindan arama/filtre/detay sekmeleri olan daha kullanisli bir admin deneyimine tasimaktir.

Hedef ekranlar:

- `/admin/urunler`
- gelecekte `/admin/urunler/[id]`
- `/katalog`
