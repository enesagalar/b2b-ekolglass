# EkolGlass Gorev Odakli UX Sozlesmesi

Durum: Aktif
Tarih: 2026-07-24

## Amac

Admin ve bayi ekranlari veritabani modelini degil kullanicinin yapmak istedigi
isi anlatir. Kullanici bir alanin ne oldugunu tahmin etmek veya sistem
terminolojisini ogrenmek zorunda kalmaz.

## Her Sayfanin Cevaplamasi Gerekenler

1. Kullanici nerede?
2. Bu sayfadaki ana is nedir?
3. Onerilen ilk veya birincil islem hangisidir?
4. Islem hangi kayitlari ve sonucu degistirir?
5. Nadiren kullanilan gelismis islemler nerede?

Bu cevaplar ayri egitim kartlariyla degil baslik, kisa aciklama, alan adi,
buton metni, durum ve bos ekran diliyle verilir.

## Arayuz Kurallari

- Teknik tablo ve model adlari yerine is dili kullanilir.
- Bir sayfada tek baskin birincil islem bulunur.
- Birbiriyle ilgisiz formlar ayni anda acik gosterilmez.
- Nadiren kullanilan ayarlar kapali `Gelismis` alaninda tutulur.
- Geri dondurulemez veya toplu islemler etkilenen kayit sayisini onceden soyler.
- Bos ekran neyin eksik oldugunu ve sonraki islemi belirtir.
- Durum metni sadece `Aktif` demez; aktifligin ticari etkisini aciklar.
- Form alanlari yalniz secilen is icin gerekli verileri ister.
- Mobilde oncelik ana islem, durum ve kritik ozet bilgisindedir.

## Fiyat Ornegi

Normal akista kullanici yalniz:

1. Ana bayi fiyatini Excel ile gunceller.
2. Gerekirse firma kartinda iskonto tanimlar.
3. Gerektiginde toplu zam veya indirim uygular.

Firma veya grup ozel fiyat listeleri istisnadir ve gelismis alanda kapali
tutulur.

## Uygulama Sirasi

1. Fiyat ve iskonto yonetimi.
2. Urun, yayin hazirligi ve stok/depo operasyonu.
3. Firma, bayi basvurusu ve siparis operasyonu.
4. Entegrasyon, rapor ve CMS ekranlari.
5. Bayi calisma alani, siparis ve hesap ekranlari.
6. Public katalog, urun detayi, sepet ve kimlik ekranlari.

Her paket lint, typecheck, test, production build ve 360/390/768/1024/1440
responsive kabulunden sonra tamamlanir.
