# Faz 7.1 - Fiyat Operasyonlari

Durum: Tamamlandi.

## Is Sozlesmesi

1. Genel liste, varsayilan bayi liste fiyatidir.
2. Musteri grubu listesi genel listeyi ezer.
3. Firma listesi tum listeleri ezer ve nihai ozel fiyattir.
4. Firma iskontosu firma listesinde tekrar uygulanmaz; genel veya grup listesinde uygulanir.
5. Ticari kosul bireysel kullaniciya degil firmaya aittir.

## Tamamlanan Kapsam

- Acik fiyat hiyerarsisi ve UI aciklamalari.
- Firma/grup/genel kapsamli liste yonetimi.
- Dolu listelerde kapsam ve para birimi kilidi.
- Firma bazli iskonto.
- Dolu `.xlsx` sablonu.
- Staging, satir onizleme, atomik uygulama, iptal ve geri alma.
- Yuzde veya sabit tutar toplu artis/azalis.
- Eszamanlilik, yetki, audit ve rollback testleri.
- Gorev odakli sade fiyat merkezi; teknik ve istisnai ayarlar kapali gelismis alanda.

## Kabul

- Hatali Excel canli fiyata dokunmaz.
- Bir satir stale ise tum parti uygulanmaz.
- Toplu degisiklik pozitif olmayan fiyat uretemez.
- Daha yeni manuel fiyat degisikligi geri alma tarafindan ezilmez.
