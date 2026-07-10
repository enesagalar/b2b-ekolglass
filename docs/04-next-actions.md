# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 3.1 - Urun ve Katalog UX Iyilestirme.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. Uyumluluk/OEM kayitlari icin duplicate/delete karar modeli ve server action testleri eklenecek.
2. Browser/HTTP smoke ile admin urun akisi ve public katalog tekrar dogrulanacak.
3. `npm run check` calistirilacak.
4. Commit ve GitHub push yapilacak.

## Son Tamamlanan Tur

Faz 3.1 kismen tamamlandi:

- `.env` lokal gelistirme icin tamamlandi; `.env.example` guvenli placeholder'a cekildi.
- `/admin/urunler` query parametreli arama/filtre/sayfalama aldi.
- `/admin/urunler/[id]` detay sayfasi eklendi.
- Detay sayfasinda genel, stok, fiyat, uyumluluk, medya ve audit sekmeleri olustu.
- Detay sayfasina stok ve fiyat guncelleme formlari tasindi.
- Medya/teknik dosya ekleme ve guncelleme UI'i eklendi.
- Medya kayitlari icin validation, server action, audit log ve revalidation eklendi.
- Uyumluluk/OEM kayitlari icin validation, server action, audit log, ekleme ve guncelleme UI'i eklendi.
- `scripts/codex-advisor.ps1` ve `docs/agent-reports/` ile arka plan Codex advisor rapor hatti kuruldu.
- `docs/agent-reports/advisor-20260709-152751.md` ilk agent raporu olarak proje hafizasina eklendi.
- `/katalog` public arama/filtre formu DB sorgusuna baglandi.
- `/katalog` fiyat gorunurlugu role gore kapatildi: guest fiyat gormez, bayi firma/grup eslesmesine gore gorur, ic ekip fiyat okuyabilir.
- `/katalog` stok gorunurlugu role gore ayrildi: guest/bayi sade stok, detayli stok yetkisi olan ic ekip toplam uygun/depo ozeti gorur.
- OEM/uyumluluk aramasi `ProductCompatibility` kayitlarini da kapsayacak sekilde genisletildi.
- `/admin/urunler/kategoriler` kategori yonetimi alt ekrani eklendi.
- `/admin/urunler/fiyat-listeleri` fiyat listesi yonetimi alt ekrani eklendi ve admin menudeki fiyat listeleri linki aktif hale getirildi.
- `/admin/urunler` ana ekrani urun olusturma, urun listesi ve alt ekran kisayollari odakli sade hale getirildi.
- `scripts/smoke-admin.mjs` kategori ve fiyat listesi alt ekranlarini da dogrulayacak sekilde genisletildi.
- Medya kayitlari icin hard delete acilmadi; `MediaAsset.isActive` uzerinden soft aktif/pasif karar modeli netlestirildi.
- `setProductMediaStatus` server action'i eklendi; medya kayitlari audit log ile aktif/pasif yapilabilir.
- `saveProductMedia` update path'ine `id + productId` sahiplik kontrolu eklendi.
- Medya validation testleri ve admin medya tab smoke kontrolu eklendi.
- Admin smoke, HTTP urun/katalog/uyumluluk smoke ve `npm run check` basarili calisti.

## Proje Sahibinden Beklenen Kararlar

Asagidaki kararlar UI uygulanmadan once veya uygulama sirasinda netlesebilir:

- Urun detay sayfasinda hangi alanlar ilk sekmede olmali?
- Public katalog filtreleri marka/model/yil mi, kategori/cam tipi mi oncelikli olmali?
- Stok bayiye adet olarak mi, sade durum olarak mi gosterilmeli?
- Arka plan advisor calismasi 30 dakikalik periyotlarla mi, yoksa sadece her kodlama turu basinda tek seferlik mi calissin?

Varsayilan karar:

- Admin urun detayinda sekmeli yapi kullanilacak.
- Public katalogda kategori, marka, model, cam tipi ve stok durumu filtreleri olacak.
- Bayiye stok ilk etapta sade durum olarak gosterilecek.
- Fiyatlar guest/PENDING icin kapali; bayi rollerinde firma veya musteri grubu eslesmesiyle, ic ekip rollerinde fiyat okuma yetkisiyle acik olacak.
