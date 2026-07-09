# Guncel Proje Durumu

Son guncelleme: 2026-07-09

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
   - Medya kayitlari icin silme/pasife alma karar modeli yok.
   - Kategori/fiyat listesi yan panelleri ayri alt ekrana bolunmedi.
   - Firma bazli fiyat gorunurlugu UI'da basladi; bayi firma/onay akisi eksik oldugu icin gercek bayi testleri sonraki faza kaldi.

3. Teklif/siparis akisi yok:
   - Teklif sepeti yok.
   - Siparis durum gecmisi ekrani yok.
   - Bayi portal yok.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

## Bir Sonraki Dogru Adim

Faz 3.1 devam edecek: Urun ve Katalog UX Iyilestirme.

Admin urun detay sayfasi stok, fiyat, medya ve uyumluluk/OEM icin duzenleme merkezi olmaya basladi. Public katalogda fiyat/stok gorunurlugu role gore ayrildi. Siradaki adim, urun operasyon alt ekranlarini bolmek ve medya/uyumluluk karar modellerini netlestirmektir.

Hedef ekranlar:

- kategori/fiyat listesi alt ekranlari
- medya soft-delete/pasiflestirme modeli
- uyumluluk duplicate/delete ve test modeli
