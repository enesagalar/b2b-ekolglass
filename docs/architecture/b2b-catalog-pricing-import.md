# B2B Katalog, Fiyat ve Siparis Sozlesmesi

## Kanal Karari

- B2B portalinda yeni teklif talebi uretilmez.
- Portalda yayindaki urunler yalniz dogrudan siparis sepetine eklenir.
- Ozel uretim ve elde olmayan proje camlari mevcut kurumsal sitenin talep akisinda yonetilir.
- Eski B2B teklif kayitlari veri ve audit kaybi olusmamasi icin salt okunur arsiv olarak korunur.
- Teklif tablolari ve tekliften siparise kaynak iliskileri saklama politikasi olmadan dusurulmez.

## CSV Kaynak Sozlesmesi

Kaynak dosya `Ekol Glass Urun Listesi 13.07.2026 - GENEL LISTE.csv` UTF-8 kodludur.

- 1.888 toplam satir vardir.
- 1.440 urun satiri vardir.
- 59 yinelenen Ekol kodu kod bazinda tekillestirilir.
- 2 urun satirinda zorunlu ad/aciklama alani eksiktir.
- 1.379 benzersiz ve tamamlanmis urun sisteme alinmistir.
- `E` ve rezistansli `R` kodlari desteklenir.
- Dosyada fiyat veya fiziksel stok miktari yoktur. Beyaz, Yesil, Fume ve Galaxy sutunlari fiyat degil renk/varyant isaretidir.

Import kod bazinda idempotenttir. Mevcut urunun teknik alanlari guncellenir; fiyat, stok miktari, yayin durumu ve siparis gecmisi ezilmez. Yeni urun `DRAFT`, `ORDER_ONLY`, sifir stok ve fiyatsiz olusur.

## Yayina Alma Kapisi

Bir urun bayiye siparis edilebilir olarak acilmadan once:

1. Teknik bilgi ve urun kodu kontrol edilir.
2. En az bir aktif net bayi fiyat satiri tanimlanir.
3. Kullanilabilir fiziksel stok girilir ve stok durumu guncellenir.
4. Urun gorseli/teknik dokumani eklenir.
5. Yayin durumu `ACTIVE` yapilir.

Fiyatsiz veya stoksuz urun otomatik yayina alinmaz. Portal tahmini fiyat veya sahte stok uretmez.

Admin urun detayinda `Yayin hazirligi` paneli genel bayi fiyatini ve kullanilabilir stogu ayri ayri kontrol eder. Iki kosul da hazir oldugunda `Urunu yayinla` komutu etkinlesir; yayinlanan urun ana sayfa ve `/urunler` katalog akisina girer.

## Net Fiyat Cozumleme

Ana ticari model:

1. Urune standart genel bayi net fiyati tanimlanir.
2. Firma kartina `0-100` araliginda musteri iskonto yuzdesi tanimlanir.
3. Etkin siparis fiyati `baz fiyat x (1 - iskonto / 100)` olarak iki ondaliga yuvarlanir.
4. Ornek: 1.000 TRY baz fiyat ve yuzde 10 firma iskontosu, 900 TRY siparis fiyati uretir.

Mevcut musteri grubu ve firma net fiyat listeleri geriye donuk uyumluluk icin gelismis istisna olarak korunur. Firma ozel net fiyat satiri secilirse musteri iskontosu ikinci kez uygulanmaz. Grup veya genel baz fiyat secilirse firma iskontosu uygulanir. Ayni kapsamda yuksek oncelik, gecerli tarih araligi ve siparis miktarina uyan en yuksek minimum adet kademesi secilir. `PriceList` ayni anda hem firma hem musteri grubu hedefleyemez.

## CMS Medya Sozlesmesi

- Banner yonetimi dosya secimiyle JPEG, PNG veya WebP kabul eder.
- Dosya uzantisina guvenilmez; magic-byte MIME kontrolu ve 5 MB limit uygulanir.
- Icerik SHA-256 object key ile saklanir ve kontrollu `/media/[file]` route'u uzerinden `nosniff` basligiyla sunulur.
- Upload action'i `admin.content.manage` yetkisi ister ve audit kaydi uretir.
- Lokal/tek sunuculu kurulumda `storage/media` kalici volume uzerinde tutulmalidir. Cok instance production kurulumunda ayni sozlesme S3/R2 uyumlu object storage adapterine tasinmalidir.

## Siradaki Operasyon Dilimi

1. ERP veya fiyat kaynagindan kod + net fiyat + stok CSV sozlesmesi alinacak.
2. Toplu fiyat/stok preview, hata raporu ve onayli import ekrani kurulacak.
3. Hazirlik kontrolu gecen urunler icin toplu yayina alma komutu eklenecek.
4. Production object storage ve CDN adapteri deployment oncesi baglanacak.
