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

Import kod bazinda idempotenttir. Mevcut urunun teknik alanlari guncellenir; fiyat, stok miktari, yayin durumu ve siparis gecmisi ezilmez. Yeni urun `DRAFT`, `ORDER_ONLY`, sifir stok ve fiyatsiz olusur. Admin importunda kategori, urun, ilk stok ve audit yazimlari tek transaction'dir; herhangi bir adim basarisizsa hicbir degisiklik kalmaz.

## Yayina Alma Kapisi

Bir urun bayiye siparis edilebilir olarak acilmadan once:

1. Teknik bilgi ve urun kodu kontrol edilir.
2. En az bir aktif net bayi fiyat satiri tanimlanir.
3. Kullanilabilir fiziksel stok girilir ve stok durumu guncellenir.
4. Urun gorseli/teknik dokumani katalog kalite kapsami icin eklenir; eksigi yayin engeli degildir.
5. Yayin durumu `ACTIVE` yapilir.

Fiyatsiz veya stoksuz urun otomatik yayina alinmaz. Portal tahmini fiyat veya sahte stok uretmez.

Admin urun detayinda `Yayin hazirligi` paneli genel bayi fiyatini ve kullanilabilir stogu ayri ayri kontrol eder. Fiyat satiri aktif donemde, genel kapsamli, pozitif tutarli ve `minQuantity=1` olmalidir. Iki kosul da hazir oldugunda `Urunu yayinla` komutu etkinlesir; sunucu kosullari transaction icinde yeniden okur ve yayinlanan urun ana sayfa ile `/urunler` katalog akisina girer. Aktif medya eksigi siparisi engellemez; UI yenileme fazinda ayri bir katalog kalite uyarisi olarak gosterilecektir.

Admin toplu yayin ekrani `/admin/urunler/yayin-hazirligi` altindadir. Taslaklar fiyat/stok eksigine gore filtrelenir; yalniz hazir urunler secilebilir. Sunucu secilen tum urunleri transaction icinde yeniden okur. Tek bir urun stale, fiyatsiz veya stoksuzsa hicbir urun yayinlanmaz. Tek komut 50 urunle sinirlidir ve her urun batch kimligiyle audit log'a yazilir.

## Fiyat Cozumleme

Ana ticari model:

1. Urune standart genel bayi liste fiyati tanimlanir.
2. Firma kartina `0-100` araliginda musteri iskonto yuzdesi tanimlanir.
3. Etkin siparis fiyati `liste fiyati x (1 - iskonto / 100)` olarak iki ondaliga yuvarlanir.
4. Ornek: 1.000 TRY baz fiyat ve yuzde 10 firma iskontosu, 900 TRY siparis fiyati uretir.

Musteri grubu ve firma fiyat listeleri kontrollu istisnadir. Firma ozel fiyat
satiri secilirse firma iskontosu ikinci kez uygulanmaz. Grup veya genel liste
secildiginde firma iskontosu uygulanir. Ayni kapsamda yuksek oncelik, gecerli
tarih araligi ve siparis miktarina uyan en yuksek minimum adet kademesi secilir.
`PriceList` ayni anda hem firma hem musteri grubu hedefleyemez.

Ticari kosullar bireysel bayi kullanicisina degil firmaya tanimlanir. Bir firmadaki
tum aktif bayi kullanicilari ayni fiyat listesini ve iskontoyu kullanir.

## Excel ve Toplu Fiyat Operasyonu

- `/admin/urunler/fiyat-aktarimi` yalniz `.xlsx` kabul eder.
- Sistemden indirilen sablon urun kodu, urun adi, secili listedeki mevcut fiyat
  ve minimum adet kolonlarini doldurur.
- Yükleme once staging partisi olusturur; kullanici eski ve yeni fiyati satir
  bazinda gorup onaylamadan canli fiyat degismez.
- Hatali urun kodu, tekrar eden kademe, gecersiz veya pozitif olmayan fiyat
  partinin uygulanmasini engeller.
- Uygulama tek transaction icindedir. Eszamanli fiyat degisikligi algilanirsa
  tum parti geri alinir.
- Liste bazli toplu artis/azalis yuzde veya sabit tutar olarak uygulanabilir.
- Excel ve toplu degisiklik partileri mevcut fiyat hala beklenen degerdeyse geri
  alinabilir; boylece daha yeni manuel degisiklik ezilmez.
- Fiyat satiri olan listenin kapsami ve para birimi degistirilemez. Yeni kapsam
  veya para birimi icin yeni liste acilir.

## CMS Medya Sozlesmesi

- Banner yonetimi dosya secimiyle JPEG, PNG veya WebP kabul eder.
- Dosya uzantisina guvenilmez; magic-byte MIME kontrolu ve 5 MB limit uygulanir.
- Icerik SHA-256 object key ile saklanir ve kontrollu `/media/[file]` route'u uzerinden `nosniff` basligiyla sunulur.
- Upload action'i `admin.content.manage` yetkisi ister ve audit kaydi uretir.
- Lokal/tek sunuculu kurulumda `storage/media` kalici volume uzerinde tutulmalidir. Cok instance production kurulumunda ayni sozlesme S3/R2 uyumlu object storage adapterine tasinmalidir.
- Depolama adapteri `MEDIA_STORAGE_PROVIDER=LOCAL|S3` ile secilir. Production ortaminda secim zorunludur; `LOCAL` icin uygulamanin `storage/media` yolu kalici volume'a baglanir, `S3` icin bucket ve region gerekir.
- S3/R2 bucket public olmak zorunda degildir. Uygulama `PutObject` ve `GetObject` ile nesneyi yonetir; `/media/[file]` aktif DB kaydi, MIME ve `nosniff` kontrollerini korur.
- Veritabanindaki `storageProvider`, nesnenin yazildigi backend'i kaydeder. Calisan deployment farkli provider ile eski nesneyi sessizce okumaya calismaz.

## Kontrollu Fiyat ve Stok Aktarimi

Fiyat ve stok CSV aktarimi `/admin/urunler/fiyat-stok-aktarimi` altinda staging tabanli olarak kurulmustur.

- UTF-8 CSV sutunlari sirasiyla `urun_kodu`, `net_bayi_fiyati`, `stok_miktari`, `depo_kodu`, `stok_gorunurlugu` olmalidir.
- Tek dosya en fazla 2 MB ve 2.000 urundur. Bir urun kodu ayni partide yalniz bir kez bulunabilir.
- Fiyat secilen aktif genel bayi fiyat listesine `minQuantity=1` olarak yazilir. Firma veya grup ozel fiyatlari bu akisla ezilmez.
- Stok `urun + depo` bazinda guncellenir; mevcut rezerve miktar korunur ve fiziksel miktar rezervasyonun altina indirilemez.
- Hata raporu bulunan parti uygulanamaz. Onay sirasinda fiyat listesi ve rezervasyonlar transaction icinde yeniden dogrulanir.
- Uygulama urunun yayin durumunu degistirmez; yayin karari toplu yayin hazirligi ekraninda ayrica verilir.
- Partiler kullanici kapsamli, 24 saatlik ve audit kayitlidir.

## Siradaki Operasyon Dilimi

1. Gercek ERP/fiyat kaynaginin kolonlari bu kanonik CSV sozlesmesine map edilecek.
2. Production object storage ve CDN adapteri deployment oncesi baglanacak.
