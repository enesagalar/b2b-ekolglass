# Admin Shell UX Spec

## Amac

Admin panel EkolGlass operasyon ekibinin gunluk is merkezi gibi calismali. Kullanicinin ilk ekranda sistemi anlamasi, bekleyen isleri gormesi ve dogru module hizli gecmesi gerekir.

## Genel Yon

- Kurumsal B2B operasyon paneli.
- Sade, yogun ama okunabilir.
- Pazarlama sitesi gibi degil.
- Sol menu + ust bar + merkezi icerik.
- Renkler kontrollu: slate/white zemin, teal vurgu, amber/red sadece durum ve risk icin.

## Layout

### Sol Sidebar

Genislik: yaklasik 260px.

Bolumler:

- Ana:
  - Dashboard
  - Bayi Basvurulari
  - Firmalar
- Ticaret:
  - Urunler
  - Stok
  - Fiyat Listeleri
  - Teklifler
  - Siparisler
- Operasyon:
  - Sevkiyat
  - Entegrasyonlar
  - Raporlar
- Sistem:
  - CMS
  - Ayarlar

Aktif sayfa belirgin olmalı. Pasif moduller "Yakinda" etiketi tasiyabilir.

### Ust Bar

- Sayfa basligi.
- Kisa aciklama.
- Hizli aksiyon butonu.
- Kullanici/rol bilgisi.
- Public portala don linki.
- Cikis butonu.

### Dashboard Icerigi

Ust metrikler:

- Bekleyen bayi
- Acik teklif
- Onay bekleyen siparis
- Dusuk stok
- Sevke hazir
- Entegrasyon uyarisi

Ana paneller:

- Bekleyen aksiyonlar
- Stok alarm listesi
- Son bayi basvurulari
- Son audit hareketleri
- Entegrasyon sagligi

## UX Kurallari

- Admin ekranda buyuk hero kullanilmaz.
- Is akisi metinleri kisa ve net olur.
- Tablo satirlari taranabilir olur.
- Durum etiketleri renkle desteklenir ama sadece renge bagli kalmaz.
- Butonlar aksiyon fiili tasir: "Incele", "Guncelle", "Onayla", "Fiyatla".
- Gereksiz aciklama metinleri ekrani doldurmaz.

## Responsive

- Desktop: sidebar kalici.
- Tablet/mobile: sidebar acilir/kapanir menu olabilir.
- Tablolar yatay scroll alabilir ama ana aksiyonlar kaybolmamalidir.

## Ilk Uygulama Kapsami

Calisan aktif linkler:

- Dashboard
- Urunler
- CMS

Pasif linkler:

- Bayi Basvurulari
- Firmalar
- Stok
- Fiyat Listeleri
- Teklifler
- Siparisler
- Sevkiyat
- Entegrasyonlar
- Raporlar
- Ayarlar

Pasif linkler tiklanabilir olmayabilir; "Yakinda" etiketiyle beklenti net tutulur.
