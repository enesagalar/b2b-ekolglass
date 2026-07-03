# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 3.1 - Urun ve Katalog UX Iyilestirme.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. Urun detay sayfasina medya/teknik dosya ekleme UI'i eklenecek.
2. Urun detay sayfasinda stok/fiyat guncelleme formlari ana listeden ayrilip detay ekranina tasinacak.
3. Public katalog filtreleri bayi rolune gore fiyat/stok gorunurluguyle zenginlestirilecek.
4. Admin urun listesinde kategori/fiyat/stok yan formlari daha kompakt alt ekranlara bolunecek.
5. Browser/HTTP smoke ile admin urun akisi ve public katalog tekrar dogrulanacak.
6. `npm run check` calistirilacak.
7. Commit ve GitHub push yapilacak.

## Son Tamamlanan Tur

Faz 3.1 kismen tamamlandi:

- `.env` lokal gelistirme icin tamamlandi; `.env.example` guvenli placeholder'a cekildi.
- `/admin/urunler` query parametreli arama/filtre/sayfalama aldi.
- `/admin/urunler/[id]` detay sayfasi eklendi.
- Detay sayfasinda genel, stok, fiyat, uyumluluk, medya ve audit sekmeleri olustu.
- `/katalog` public arama/filtre formu DB sorgusuna baglandi.
- Admin smoke, HTTP urun/katalog smoke ve `npm run check` basarili calisti.

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
