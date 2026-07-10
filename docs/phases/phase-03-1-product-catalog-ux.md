# Faz 3.1 - Urun ve Katalog UX Iyilestirme

## Mevcut Durum

`/admin/urunler` urun, fiyat ve stok kayitlarini yonetebiliyor. Kategori ve fiyat listesi yonetimi alt ekranlara ayrildi. Liste arama/filtre/sayfalama, urun detay sayfasi, stok/fiyat formlari, medya/teknik dosya yonetimi ve uyumluluk/OEM yonetimi baslatildi.

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
- [x] Kategori ve fiyat listelerini ayri alt ekranlara bolme.
- [x] Public katalog arama/filtre.
- [x] Medya/teknik dosya ekleme ve yonetim UI'i.
- [x] Uyumluluk/OEM ekleme ve yonetim UI'i.
- [x] Bayi rolune gore public katalog fiyat/stok gorunurlugu.
- [x] OEM/uyumluluk aramasini public katalog sorgusuna dahil etme.
- [x] Uyumluluk/OEM duplicate/delete karar modeli.
- [x] Medya pasife alma/silme karar modeli.

## Cikis Kriterleri

- Admin 100+ urun icinde hizli arama yapabilir.
- Urun detayinda stok/fiyat/teknik bilgi dagilmadan yonetilir.
- Public katalog admin verisini dogru filtrelerle okur.
- Validation ve smoke testler korunur.
