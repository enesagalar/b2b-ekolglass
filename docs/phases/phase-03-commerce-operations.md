# Faz 3 - B2B Commerce Operasyonu

## Hedef

Bayi operasyonunun gercek siparis ve teklif akisina tasinmasi.

## Kapsam

- Urun CRUD ve teknik detay formlari.
- Katalog arama, filtre, sayfalama.
- Fiyat listesi atama ve bayi bazli fiyat gorunurlugu.
- Teklif sepeti.
- Teklif durum yonetimi.
- Siparis olusturma, onay ve durum gecmisi.
- Cari limit ve payment terms modelinin uygulanmasi.

## Cikis Kriterleri

- Bayi kendi yetkisiyle teklif/siparis baslatabilir.
- Satis ekibi teklifi fiyatlandirabilir.
- Siparis durumlari history ile izlenir.
- Fiyat gorunurlugu role/company bazli calisir.

## 2026-07-13 Ilerleme

Tamamlandi:

- Kalici siparis sepeti ve checkout.
- Firma adresi secimi/olusturma.
- Transactional server fiyat ve stok dogrulamasi.
- Company-scoped idempotency, request hash ve cart version kontrolu.
- Stok rezervasyon defteri ve siparis snapshot'lari.
- Bayi siparis detay/takip ekrani.
- Admin siparis liste ve salt okunur operasyon detayi.

Siradaki dilim:

- Admin durum gecisleri ve audit.
- Iptal/teslim akislariyla rezervasyon release/consume islemleri.
- Admin teklif fiyatlandirma ve durum yonetimi.
- City Lojistik adapterine siparis/sevkiyat aktarimi.
