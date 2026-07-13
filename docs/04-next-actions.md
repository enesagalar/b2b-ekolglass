# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 3.3 - Teklif/Siparis Olusturma, Detay Akislari ve Davet Teslimi.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. Siparis ve teklif listelerine filtre ve sayfalama eklenecek.
2. Company-scoped siparis detay ve server-side fiyatlanan taslak siparis olusturma akisi baslatilacak.
3. Transactional e-posta adapter interface'i ve saglayici karari eklenecek.
4. Login rate-limit e-posta + IP anahtarli indeksli modele tasinacak.
5. Admin teklif inceleme, fiyatlandirma ve durum gecis ekrani tasarlanacak.
6. Birlesik web/CMS icin canli URL ve redirect envanteri dokumani baslatilacak.

## Son Tamamlanan Tur

Faz 3.3 teklif talebi dilimi tamamlandi:

- Public `/urunler/[id]` ve bayi `/bayi/urunler/[id]` urun detaylari eklendi.
- Aktif urun medyasi, teknik ozellik, OEM/uyumluluk ve role gore fiyat/stok gorunumu acildi.
- `QuoteCart` ve `QuoteCartItem` ile kullanici+firma kapsamli kalici sepet olusturuldu.
- Teklif gonderiminde urun aktifligi, order mode ve firma fiyatlari transaction icinde yeniden okunuyor.
- Miktar kademesi; firma, musteri grubu ve public scope onceligiyle deterministik seciliyor.
- Fiyat, toplam, fiyat listesi, kademe ve scope snapshot'i `QuoteRequestItem`a yaziliyor.
- Idempotency anahtari cift gonderimde ikinci teklif olusmasini engelliyor.
- `/bayi/teklifler/[id]` company-scoped sonuc/detay ekrani ve liste baglantilari eklendi.
- Firma A/Firma B sepet mutasyonu, fiyat kademesi ve idempotency SQLite entegrasyon testiyle dogrulandi.
- 11 test dosyasi, 53 test, production build, genisletilmis HTTP smoke ve gercek browser akisi basarili.

Faz disi UX/IA konsolidasyonu tamamlandi:

- `/` CMS banner, genel arama, kategori ve urun kartlariyla ticaret ana sayfasina donusturuldu.
- Bayi oturumu ana sayfada firma kimligi ve operasyon baglantilariyla gorunur hale geldi.
- `/urunler` public kesif, `/bayi/urunler` firma fiyatli bayi deneyimi olarak ayrildi.
- `/katalog` eski linkler icin `/urunler`e kalici yonlendirildi.
- Public bayi girisi ile noindex ic ekip girisi ayrildi; public admin baglantilari kaldirildi.
- Sitemap, robots ve metadata politikasi indekslenebilir public rotalara gore duzenlendi.
- CMS hero gorseli admin icerik ekranindan yonetilebilir hale geldi.
- Iki bagimsiz agent UX ve kullanici yolculugu incelemesi proje hafizasina kaydedildi.

Faz 3.3 ilk bayi portal dilimi tamamlandi:

- Merkezi ACTIVE dealer + APPROVED company context DAL eklendi.
- Dealer login `/` ticaret ana sayfasina yonlendiriliyor; firma kimligi header'da gorunuyor.
- `/bayi`, `/bayi/siparisler`, `/bayi/teklifler`, `/bayi/hesabim` gercek DB verisiyle calisiyor.
- Firma A/Firma B order/quote izolasyonu SQLite entegrasyon testiyle dogrulandi.
- Operasyon sorgu indeksleri migration ile eklendi.
- Mobil listeler kompakt kayit duzenine cevrildi; body overflow ve konsol hatasi yok.
- Cari bakiye/teklif tutari gibi modelde olmayan veriler uydurulmuyor.

Faz 3.2 aktivasyon/firma/izolasyon dilimi tamamlandi:

- `UserActivationToken` migration'i, 48 saatlik hash token, consume/revoke akisi eklendi.
- `/aktivasyon/[token]` ilk parola belirleme ekrani eklendi.
- `/admin/firmalar` liste/detay ve firma kullanicisi davet akisi eklendi.
- Bu dilimdeki gecici dealer `/katalog` yonlendirmesi sonraki UX/IA konsolidasyonunda `/` olarak degistirildi.
- Dealer session ile `/admin` erisimi smoke testte reddediliyor.
- Katalog fiyatlari DB seviyesinde firma/grup/public scope ile filtreleniyor.
- Auth DAL `passwordHash` dondurmuyor ve render sirasinda DB mutasyonu yapmiyor.
- Production manuel aktivasyon linki varsayilan kapali.
- 9 test dosyasi, 50 test, SQLite aktivasyon ve cross-company fiyat izolasyonu basarili.
- Admin firma/aktivasyon HTTP smoke ve responsive browser QA basarili.
- `www.ekolglass.com` + B2B + ortak CMS vizyonu resmi architecture dokumanina yazildi.

Faz 3.2 admin inceleme/provisioning dilimi tamamlandi:

- `/admin/bayi-basvurulari` liste, arama, durum filtresi, sayfalama ve KPI ekranlari eklendi.
- `/admin/bayi-basvurulari/[id]` inceleme ve ticari kosul ekrani eklendi.
- Admin menusu ve dashboard bayi basvurusu ekranlarina baglandi.
- `dealer.application.review` permission'i hem sayfa okumalarinda hem server action'da zorunlu hale getirildi.
- Durum gecis tablosu ve `expectedUpdatedAt` optimistic concurrency kontrolu eklendi.
- Onaydan tek transaction ile `Company`, `DEALER_OWNER/INVITED`, basvuru baglantisi ve audit kaydi uretiliyor.
- Musteri grubu onayda zorunlu; payment terms ve credit limit firma kaydina yaziliyor.
- E-posta/firma/vergi numarasi ve mevcut rol cakismalari otomatik provisioning'i guvenli sekilde durduruyor.
- Public basvuru e-postasi lowercase normalize ediliyor.
- DealerApplication ve AuditLog sorgu indeksleri migration ile eklendi ve lokal DB'ye uygulandi.
- 6 test dosyasinda 45 test, gercek SQLite tekrar onay testi, admin HTTP smoke ve responsive browser QA basarili.

Faz 3.1 onceki turda tamamlandi:

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
- Uyumluluk/OEM kayitlari icin normalized duplicate karar modeli eklendi.
- Uyumluluk/OEM kayitlari icin audit log yazan silme action'i ve admin UI'i eklendi.
- Uyumluluk/OEM duplicate/delete server action testleri eklendi.
- Admin uyumluluk tab smoke kontrolu ve public katalog OEM arama smoke kontrolu eklendi.
- Admin smoke, HTTP urun/katalog/uyumluluk smoke ve `npm run check` basarili calisti.

## Proje Sahibinden Beklenen Kararlar

Asagidaki kararlar UI uygulanmadan once veya uygulama sirasinda netlesebilir:

- Public katalog filtreleri marka/model/yil mi, kategori/cam tipi mi oncelikli olmali?
- Stok bayiye adet olarak mi, sade durum olarak mi gosterilmeli?
- Arka plan advisor calismasi 30 dakikalik periyotlarla mi, yoksa sadece her kodlama turu basinda tek seferlik mi calissin?
- Transactional e-posta saglayicisi hangisi olacak?
- Bayi onayi tek firma sahibi mi, yoksa bir firmada birden fazla bayi kullanicisi mi uretecek?
- Canonical host `www` mi apex mi olacak?
- B2B host `portal.ekolglass.com` mu `b2b.ekolglass.com` mu olacak?

Varsayilan karar:

- Admin urun detayinda sekmeli yapi kullanilacak.
- Public katalogda kategori, marka, model, cam tipi ve stok durumu filtreleri olacak.
- Bayiye stok ilk etapta sade durum olarak gosterilecek.
- Fiyatlar guest/PENDING icin kapali; bayi rollerinde firma veya musteri grubu eslesmesiyle, ic ekip rollerinde fiyat okuma yetkisiyle acik olacak.
- Faz 3.2'de ilk uygulama, onaylanan basvurudan tek `Company` ve bir `DEALER_OWNER` kullanicisi uretme varsayimiyla ilerleyecek.
- Ilk bayi kullanicisi gecici parola ile `ACTIVE` yapilmayacak; `INVITED` olusacak ve sifresini tek kullanimlik aktivasyon akisinda kendi belirleyecek.
- Birlesik platform varsayimi: `www` gateway/kurumsal, `portal` B2B, `/admin` ortak yonetim.
- Root gateway SEO envanteri ve redirect haritasi tamamlanmadan canliya alinmayacak.
