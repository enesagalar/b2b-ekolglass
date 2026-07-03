# Faz 2.5 - Admin UX Shell ve Operasyon Merkezi

## Neden Bu Faz Var?

Mevcut admin panel teknik olarak calisiyor, ancak kullanici deneyimi profesyonel B2B operasyon paneli seviyesinde degil.

Beklenti:

- Sol tarafta kalici menu.
- Ortada dashboard ve is akislari.
- Urun, stok, teklif, siparis, bayi ve sevkiyat sureclerinin tek sistem gibi hissedilmesi.
- Her admin sayfasinin ayni kabuk ve navigasyonla calismasi.

## Kapsam

### Admin Shell

- `/admin` altindaki tum sayfalar icin ortak layout.
- Sol sidebar.
- Ust bar.
- Aktif sayfa basligi.
- Hizli aksiyon alani.
- Mobilde kapanabilir menu.

### Sidebar Modul Yapisi

Onerilen menu:

- Dashboard
- Bayi Basvurulari
- Firmalar
- Urunler
- Stok
- Fiyat Listeleri
- Teklifler
- Siparisler
- Sevkiyat
- CMS
- Raporlar
- Entegrasyonlar
- Ayarlar

Ilk implementasyonda sadece calisan ekranlar aktif link olur:

- Dashboard
- Urunler
- CMS

Digerleri pasif/coming soon etiketiyle gosterilebilir.

### Dashboard

Dashboard kart koleksiyonu olmaktan cikip operasyon merkezi olacak.

Bolumler:

- Ust metrik seridi.
- Bekleyen aksiyonlar.
- Stok alarm listesi.
- Son bayi basvurulari.
- Son audit hareketleri.
- Entegrasyon durumu.

### UX Kalite Kriterleri

- Kurumsal, sade, hizli okunabilir.
- Operasyonel SaaS gibi yogun ama duzenli.
- Buyuk hero veya pazarlama dili yok.
- Tablo, filtre, durum etiketi, aksiyon butonu net.
- Text ve butonlar mobilde tasmaz.
- Kart icinde kart kullanimi abartilmaz.

## Cikis Kriterleri

- `/admin` profesyonel dashboard gibi gorunur.
- `/admin/urunler` ve `/admin/icerik` ayni shell icinde calisir.
- Sidebar aktif route'u gosterir.
- `npm run check` basarili.
- Browser ile desktop ve mobile smoke test yapilir.

## Riskler

- Sadece gorsel makyaj yapilip is akisi iyilesmezse beklenti karsilanmaz.
- Sidebar cok erken fazla modul acarsa demo hissi yaratir.
- Mobil menu ihmal edilirse admin kullanim kalitesi duser.

## Uygulama Notu

Bu fazda yeni business logic minimum tutulur. Ana odak admin deneyimi, navigasyon ve operasyon akisinin gorunur hale gelmesidir.
