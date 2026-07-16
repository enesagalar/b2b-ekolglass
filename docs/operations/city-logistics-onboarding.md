# City Lojistik Teknik Onboarding Paketi

## Durum

16 Temmuz 2026 tarihinde City Lojistik'in resmi Turkiye alan adlari, kargo takip uygulamasi ve depo transfer uygulamasi incelendi. Kamuya acik, surumlu bir API dokumani veya developer portal bulunamadi.

Güney Afrika merkezli `citylogistics.co.za` alan adindaki API dokumani farkli bir firmaya aittir ve bu proje icin sozlesme kaynagi olarak kullanilamaz.

Resmi iletisim:

- E-posta: `info@citylojistik.com`
- Telefon: `0850 259 24 89`
- Web: `https://citylojistik.com/`
- Takip: `https://kargotakip.citylojistik.com/`

## City Ekibinden Istenecek Teknik Paket

1. Test ve canli ortam base URL'leri.
2. API dokumani ve acik surum numarasi.
3. Test hesabi, musteri/sozlesme kodu ve kimlik dogrulama yontemi.
4. Token veya credential yenileme ve iptal proseduru.
5. Gonderi olusturma endpointi, zorunlu alanlar ve ornek istek/yanitlar.
6. Gonderi iptal kurallari ve iptal edilebilir durumlar.
7. Barkod/etiket uretimi, formatlar ve yeniden basim davranisi.
8. Takip sorgusu, durum kodlari ve terminal durum listesi.
9. Webhook event listesi, imza dogrulama algoritmasi, retry politikasi ve IP araliklari.
10. Idempotency anahtari destegi ve ayni istegin tekrarindaki davranis.
11. Rate limit, timeout, bakim penceresi ve beklenen SLA.
12. Hata modeli, gecici/kalici hata kodlari ve destek eskalasyon kanali.
13. Desi, koli, palet, parcali gonderi ve otomotiv camina ozel paketleme alanlari.
14. Test senaryolari: basarili teslimat, iptal, iade, hasar ve adres sorunu.

## Gonderilecek E-posta Taslagi

Konu: EkolGlass B2B Portal - City Lojistik API Entegrasyon Bilgileri

Merhaba,

EkolGlass B2B siparis ve sevkiyat sistemini City Lojistik ile entegre etmek istiyoruz. Gonderi olusturma, iptal, barkod/etiket ve takip durumlarini sistemler arasinda otomatik yonetebilmek icin test ve canli ortam API dokumani ile entegrasyon hesabina ihtiyacimiz bulunuyor.

Teknik ekibinizden API surumu, base URL'ler, kimlik dogrulama yontemi, test hesabi, musteri kodu, idempotency davranisi, webhook imza dogrulamasi, durum kodlari, rate limit ve ornek payload bilgilerini paylasmanizi rica ederiz.

Teknik irtibat kisisi ve test kabul surecini de iletebilirseniz entegrasyon planini birlikte netlestirebiliriz.

Saygilarimizla,
EkolGlass

## Aktivasyon Kapisi

Canli aktarim ancak asagidaki kosullarin tamami saglandiginda acilir:

- Dokuman ve API surumu City ekibiyle dogrulanir.
- DTO ve durum eslemeleri fixture tabanli contract testlerinden gecer.
- Test hesabinda create, cancel, label ve tracking kabul senaryolari tamamlanir.
- Webhook varsa imza, replay ve tenant eslesmesi test edilir.
- Log redaksiyonu credential ve kisisel veri sizdirmadigini kanitlar.
- Timeout, retry, idempotency ve dead-letter senaryolari dogrulanir.
- Production credential'i secret manager uzerinden tanimlanir.
- `CITY_LOJISTIK_ENABLED=true` son operasyon onayindan sonra verilir.

Yalnizca environment degerlerini doldurmak aktarimi acmaz. Kod seviyesindeki adapter kabul kapisi da tamamlanmis olmalidir.
