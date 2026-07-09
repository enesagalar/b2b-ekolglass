# Faz 3.1 - Urun ve Katalog UX Iyilestirme

## Mevcut Durum

`/admin/urunler` urun, kategori, fiyat listesi, fiyat ve stok kayitlarini yonetebiliyor. Liste arama/filtre/sayfalama, urun detay sayfasi, stok/fiyat formlari ve medya/teknik dosya yonetimi baslatildi.

## Hedef

Urun operasyonunu gercek kullanicinin gunluk is akisina uygun hale getirmek.

## Kapsam

- [x] Urun listesi arama.
- [x] Kategori/status/stok durumu filtreleri.
- [x] Sayfalama.
- [x] Urun detay sayfasi:
  - Genel bilgiler
  - Stok
  - Fiyatlar
  - Uyumluluk
  - Medya/teknik dosyalar
  - Audit gecmisi
- [x] Stok ve fiyat guncelleme formlarini detay ekranina tasima.
- [ ] Stok ve fiyat listelerini ayri alt ekranlara bolme.
- [x] Public katalog arama/filtre.
- [x] Medya/teknik dosya ekleme ve yonetim UI'i.
- [ ] Uyumluluk/OEM ekleme ve yonetim UI'i.

## Cikis Kriterleri

- Admin 100+ urun icinde hizli arama yapabilir.
- Urun detayinda stok/fiyat/teknik bilgi dagilmadan yonetilir.
- Public katalog admin verisini dogru filtrelerle okur.
- Validation ve smoke testler korunur.
