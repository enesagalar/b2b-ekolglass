# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 3.1 - Urun ve Katalog UX Iyilestirme.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. `/admin/urunler` icin arama ve filtre query parametreleri eklenecek.
2. Urun listesi ve urun olusturma bolumleri daha net ayrilacak.
3. Urun detay sayfasi tasarlanacak:
   - Genel bilgiler
   - Stok
   - Fiyatlar
   - Uyumluluk
   - Medya/teknik dosyalar
4. Public katalog icin arama/filtre UX'i eklenecek.
5. Browser ile admin urun akisi ve public katalog dogrulanacak.
6. `npm run check` calistirilacak.
7. Commit ve GitHub push yapilacak.

## Son Tamamlanan Tur

Faz 2.5 tamamlandi:

- Ortak admin shell.
- Sol sidebar.
- Ust bar.
- Mobil menu.
- Operasyon dashboard.
- Urun ve CMS ekranlarinin shell icine alinmasi.

## Proje Sahibinden Beklenen Kararlar

Asagidaki kararlar UI uygulanmadan once veya uygulama sirasinda netlesebilir:

- Urun detay sayfasinda hangi alanlar ilk sekmede olmali?
- Public katalog filtreleri marka/model/yil mi, kategori/cam tipi mi oncelikli olmali?
- Stok bayiye adet olarak mi, sade durum olarak mi gosterilmeli?
- Fiyat gorunurlugu hangi rolde acilacak?

Varsayilan karar:

- Admin urun detayinda sekmeli yapi kullanilacak.
- Public katalogda kategori, marka, model, cam tipi ve stok durumu filtreleri olacak.
- Bayiye stok ilk etapta sade durum olarak gosterilecek.
