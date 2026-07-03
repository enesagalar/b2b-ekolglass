# Faz 3.1 - Urun ve Katalog UX Iyilestirme

## Mevcut Durum

`/admin/urunler` urun, kategori, fiyat listesi, fiyat ve stok kayitlarini yonetebiliyor. Ancak ekran ilk teknik CRUD seviyesinde.

## Hedef

Urun operasyonunu gercek kullanicinin gunluk is akisina uygun hale getirmek.

## Kapsam

- Urun listesi arama.
- Kategori/status/stok durumu filtreleri.
- Sayfalama.
- Urun detay sayfasi:
  - Genel bilgiler
  - Stok
  - Fiyatlar
  - Uyumluluk
  - Medya/teknik dosyalar
  - Audit gecmisi
- Stok ve fiyat listelerini ayri alt ekranlara bolme.
- Public katalog arama/filtre.

## Cikis Kriterleri

- Admin 100+ urun icinde hizli arama yapabilir.
- Urun detayinda stok/fiyat/teknik bilgi dagilmadan yonetilir.
- Public katalog admin verisini dogru filtrelerle okur.
- Validation ve smoke testler korunur.
