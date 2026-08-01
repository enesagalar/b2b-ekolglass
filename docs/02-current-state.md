# Guncel Proje Durumu

## 2026-08-01 - Faz 7.3 urun detay sorgusu ve katalog gorsel hatti

- `/admin/urunler/[id]` artik her istekte stok, fiyat, uyumluluk ve medya
  iliskilerinin tamamini yuklemez. Genel sekme yalniz yayin uygunlugu icin dar
  fiyat/stok ozetlerini; diger sekmeler yalniz kendi tam kayitlarini sorgular.
- Fiyat ve stok sekmelerindeki tam satirlar yayin uygunlugu hesabinda yeniden
  kullanilir. Denetim sekmesi urun ve fiyat audit kayitlarini korurken medya,
  uyumluluk, fiyat listesi ve depo ana verisini yuklemez.
- Bilinmeyen `tab` degeri bos ekran veya yetki sapmasi yerine guvenli bicimde
  `Genel` sekmesine doner. Fiyat ve stok sekmelerinin mevcut izin kapilari
  korunur.
- Urun karti, urun detay ana gorseli ve galeri kucuk gorselleri ortak
  `CatalogImage` bilesenine tasindi. Portal icindeki medya `next/image`
  optimizer, boyut ipucu ve lazy-load hattini kullanir; musteri tarafindan
  yonetilen HTTPS kaynaklari kirilgan genis host allowlist'i acilmadan dogrudan
  sunulur.
- Sorgu plani ve gorsel hatti 17 hedefli testle sabitlendi. Tam yerel kabul:
  lint, Next 16 typecheck, 19/19 Node, 470/470 Vitest, 42/42 migration
  integrity, 0 production dependency vulnerability, production build ve
  52/52 authenticated smoke basarili.
- Browser kabulu: gercek admin urununde `Genel`, `Stok`, `Fiyat`, `Uyumluluk`,
  `Medya` ve `Denetim` sekmeleri dogru aktif durumu gosterdi. 375 ve 1425 px
  olcumlerinde yatay tasma, browser hata veya uyari kaydi yoktur. Yerel
  veritabaninda yayindaki urunlere bagli aktif medya bulunmadigi icin canli
  optimizer istegi yerine yerel/harici kaynak davranisi bilesen testiyle
  kanitlandi.
- Commit `3bf44d7` icin GitHub Actions `30699625492` kalite ve release artifact
  islerini basariyla tamamladi; recovery drill, authenticated smoke, immutable
  image taramasi, provenance ve release manifest hatti gecti. Tek annotation,
  pinned resmi GitHub action'larinin Node 20 taniminin runner tarafindan Node
  24'e zorlanmasiyla ilgili mevcut CI bakim kaydidir.
- Faz 7.3 yerel kod paketinde kalan kapanis isi, Turkce metin, klavye/focus ve
  gercek iOS/Android kabul taramasidir. Repository `main` branch protection ve
  resmi GitHub Actions Node 24 runtime gecisi ayri yonetim/CI bakimidir.

## 2026-08-01 - Faz 7.3 urun ve stok hareketi mobil UX

- `/admin/urunler` 1280 px altinda kod, yayin durumu, arac/kategori baglami,
  stok, yetkili kullanici icin fiyat ve tek detay aksiyonunu amaca ozel kayit
  olarak sunar. Genis ekranda yogun tablo korunur.
- `/admin/raporlar?view=stock-movements` mobilde hareket turu, zaman, urun/depo,
  fiziksel ve rezerve once/sonra degerleri, kaynak, aktor ve gerekceyi okunabilir
  defter kayitlarina ayirir.
- Her iki liste gecersiz yuksek sayfa numarasini son sayfaya ceker. Hareket
  defteri filtreleri sayfalama boyunca korunur; pasif yonler baglanti degildir.
- Is kurallari, stok hareket defteri yazimi, fiyat yetkisi ve urun/stok
  mutation davranislari degistirilmedi.
- Ortak admin route loading iskeletindeki 520 px ic genislik mobil grid'i
  buyutuyordu. `min-w-0` ve sinirli tam genislik ile gecis anindaki yatay
  scrollbar kaldirildi.
- Yerel kabul: lint, Next 16 typecheck, 19/19 Node, 453/453 Vitest,
  42/42 migration integrity, 0 production dependency vulnerability,
  production build ve 52/52 authenticated smoke basarili.
- Browser kabulu: 390 ve 1024 px'de yatay tasma yok, mobil kayitlar aktif ve
  tablolar gizli; 1440 px'de tablolar aktif, mobil kayitlar gizli. Yuksek sayfa
  urunlerde 56/56'ya, hareketlerde 28/28'e cekildi; hata/uyari gunlugu bos.
- Commit `6a7bf69` icin GitHub Actions `30698332950` kalite ve release artifact
  islerini basariyla tamamladi; recovery drill, authenticated smoke, immutable
  image taramasi, provenance ve release manifest hatti gecti.
- CI yalniz GitHub'in pinned resmi checkout/setup-node/upload-artifact
  action'larinin Node 20 runtime bildirimini Node 24'e zorlamasiyla ilgili
  deprecation annotation'i uretiyor; uygulama testi veya release kapisi hatasi
  degildir ve ayri CI bakim borcu olarak izlenir.
- Faz 7.3 kapanmadi. Turkce metin, klavye/focus, gercek cihaz kabul taramasi ve
  repository branch protection ayari siradadir.

## 2026-08-01 - Faz 7.3 firma ve bayi basvurusu mobil UX

- `/admin/firmalar` ve `/admin/bayi-basvurulari` ekranlarinda yatay kayan
  tablolar mobilde kaldirildi; durum, siradaki gorev, temel operasyon verisi
  ve tek birincil aksiyon amaca ozel kayitlarla sunulur.
- 1024 px ve ustunde mevcut yogun masaustu tablolari korunur; is kurallari,
  izinler, firma izolasyonu ve durum gecisleri degistirilmedi.
- Gecersiz veya cok yuksek `page` degeri bos ekran yerine gercek son sayfaya
  cekilir. Pasif onceki/sonraki durumlari artik odaklanabilir baglanti degildir.
- Ortak sayfalama bileseni erisilebilir ad, canli sayfa bilgisi ve 44 px dokunma
  hedefiyle iki ekrani ayni davranis sozlesmesine baglar.
- Yerel kabul: lint, Next 16 typecheck, 19/19 Node, 452/452 Vitest,
  42/42 migration integrity, 0 production dependency vulnerability,
  production build ve 52/52 authenticated smoke basarili.
- Browser kabulu: 390 px'de iki ekranda yatay tasma yok, mobil kayitlar aktif
  ve masaustu tablolar gizli; 1440 px'de tablolar aktif, mobil kayit aksiyonlari
  gizli. Yuksek sayfa numarasi son sayfaya cekiliyor ve browser hata/uyari
  gunlugu bos.
- Commit `0d379be` icin GitHub Actions `30697297769` kalite ve release artifact
  islerini basariyla tamamladi; immutable OCI image taramasi, provenance ve
  release manifest hatti gecti.
- Faz 7.3 kapanmadi. Urun/stok hareketi mobil kabul paketi, urun detay sorgu
  optimizasyonu ve repository branch protection ayari siradadir.

## 2026-07-29 - Faz 7.3 dependency ve aktarim butunlugu

- ExcelJS ve onun runtime `archiver/glob/minimatch/brace-expansion` zinciri
  kaldirildi. `.xlsx` okuma ve yazma, dar kapsamli `read-excel-file` ve
  `write-excel-file` paketlerine tasindi.
- Prisma istemcisi, adapteri ve CLI 7.9.1'e sabitlendi; valibot advisory zinciri
  runtime ve generate/migrate grafiginden cikti.
- Production dependency audit 0 bulgu ile geciyor. Tam dependency agacinda
  yalniz ESLint/Next lint arac zincirinden gelen 9 high gelistirme-bagimliligi
  bulgusu kaldi; ESLint 10 mevcut Next plugin peer sozlesmesiyle uyumlu olmadigi
  icin breaking override uygulanmadi.
- CI artik kilitli agaci `npm ls --all` ile dogrular ve release kapisinda
  production dependency grafigini denetler. PR dependency review yeni high ve
  critical bulgulari reddetmeye devam eder.
- Fiyat/stok onizlemesi mevcut fiyat ile depo stok miktari, rezervasyon,
  gorunurluk ve `updatedAt` snapshot'larini saklar. Uygulama aninda bunlardan
  biri degismisse tum batch fail-closed durur ve hicbir satir yazilmaz.
- Preview ve cancel audit kayitlari ilgili mutation ile ayni transaction'a
  alindi. Uygula, iptal ve geri alma dugmeleri pending durumunda kilitlenir.
- Yerel kabul: 42/42 migration integrity, 0 production dependency vulnerability,
  lint, typecheck, 19/19 Node, 450/450 Vitest, production build ve 52/52
  authenticated smoke basarili.
- Browser kabulu: 390 px sinifinda yatay tasma yok ve mobil kayitlar aktif;
  1440 px'de masaustu tablo aktif, mobil satir kaydi gizli.
- Fiyat ve fiyat/stok onizleme satirlari mobilde yatay tablo yerine amaca ozel
  fiyat, stok, depo ve kontrol kayitlari olarak sunulur.
- GitHub Actions `30438583188`, commit `79fc40a` icin `quality` ve
  `release-artifact` islerini basariyla tamamladi. Recovery drill evidence ile
  immutable release manifest artifact'i uretildi.
- Faz 7.3 kapanmadi. Kalan ikincil ekran taramasi ve `main` branch protection
  dogrulamasi siradadir.

## 2026-07-29 - Faz 7.3 teklif-siparis ticari butunlugu

- Onayli eski teklifin siparise donusumu artik normal sepet checkout'u ile
  ayni `order-checkout` kilidini ve kredi degerlendirme kuralini kullanir.
- Firma vadesi, kredi politikasi, limit ve siparis oncesi/sonrasi risk
  degerleri siparise degismez snapshot olarak yazilir.
- TRY disi para birimi, tanimsiz politika veya limiti asan hesap
  `WAITING_FOR_APPROVAL` durumunda baslar. Yalniz acikca limitsiz TRY hesap
  dogrudan `SUBMITTED` olabilir.
- Teklif donusumunun tuketicisi olmayan outbox olayi kaldirildi. Siparis
  olayi, e-posta gec calissa bile ilk siparis durumunu payload icinde tasir.
- Idempotent tekrar, stok rezervasyonu, EUR fail-closed, limitsiz TRY ve
  limitli TRY mevcut risk senaryolari entegrasyon testleriyle dogrulandi.
- Yerel regresyon: lint, typecheck, 19/19 Node, 448/448 Vitest, 41/41
  migration integrity, release demo, production build ve 52/52 authenticated
  smoke basarili.
- Faz 7.3 kapanmadi. Dependency audit/CI kapisi ve kalan yogun ikincil admin
  ekranlarinin mobil/gorev odakli UX kabulu siradaki yerel paketlerdir.

## 2026-07-28 - Faz 7.3 admin teklif arsivi UX

- `/admin/teklifler` yeni talep kuyrugu degil, gecmis tekliflerin fiyat,
  karar, durum ve siparis donusum izini koruyan `Teklif arsivi` olarak calisir.
- Yeni B2B teklif olusturma kapali kalir; standart urunler dogrudan siparis
  akisindan ilerler.
- Arsiv `Acik eski kayitlar`, `Teklif ve karar`, `Siparise donusen` ve
  `Kapanan` gruplarina ayrildi. Her kayit gecmis durumdan turetilen tek sonraki
  yonetim gorevini aciklar.
- Arama teklif, firma, yetkili ve donusen siparis numarasini kapsar. Arsiv
  sayaclari arama baglamiyla birlikte hesaplanir.
- Kesin durum filtresi secili arsiv grubuyla sinirlidir. Uyumsuz durum
  enjeksiyonu bos sonuc uretir; gecersiz yuksek sayfa numarasi son sayfaya
  cekilir.
- Donusen kayitlar ilgili siparise dogrudan baglanir. Arsiv listesindeki fiyat
  alanlari yalniz `price.read` izniyle veri sorgusuna ve arayuze girer.
- Bayi teklif arsivi salt okunurdur. Admin tarafinda yalniz gecmisten kalan
  acik kayitlar mevcut state machine ile sonuclandirilabilir; yeni teklif
  talebi veya sepeti olusturulamaz.
- 1024 px ve altinda mobil kayitlar, 1440 px'de yogun tablo kullanilir; sayfa
  genelinde yatay tasma yoktur.
- Yerel kabul: 19/19 Node, 446/446 Vitest, 52 authenticated smoke, lint,
  typecheck, production build ve 360/390/768/1024/1440 px browser QA basarili.

## 2026-07-28 - Faz 7.3 admin siparis is kuyrugu UX

- `/admin/siparisler` teknik durum tablosu yerine `Incelenecek`,
  `Bekletilen`, `Hazirlik`, `Sevke hazir`, `Yolda` ve `Tamamlanan` is
  kuyruklariyla calisir.
- `ON_HOLD` ticari incelemeye karistirilmaz; operasyon veya ticari engel
  cozumunu bekleyen ayri kuyrukta gosterilir.
- Her kayit mevcut durumdan turetilen tek siradaki yonetim gorevini aciklar.
  Kuyruk grubu herhangi bir durum gecisi veya ek yetki vermez.
- Arama siparis, firma, kullanici ve sevkiyat takip numarasini kapsar. Kuyruk
  sayaclari arama ve manuel City filtresiyle ayni veri kumesinden uretilir.
- Kesin durum filtresi yalniz secili kuyrugun durumlarini sunar; veri katmani
  sahte veya uyumsuz `view + status` birlesimlerini de fail-closed kesistirir.
- `DRAFT` kayitlar operasyon kuyruguna girmez. Gecersiz yuksek sayfa numarasi
  gercek son sayfaya cekilir ve UI `data.page` degerini gosterir.
- 1024 px ve altinda yatay tablo yerine amaca ozel mobil siparis kayitlari,
  1440 px'de yogun masaustu tablosu kullanilir.
- Yerel kabul: 19/19 Node, 441/441 Vitest, 52 authenticated smoke, lint,
  typecheck, 41 migration integrity, production build ve 360/390/768/1024/1440
  px browser QA basarili; tarayici hata/uyari gunlugu bostur.
- Ilk 4-worker Vitest kosusunda degismeyen parola sifirlama testi Windows
  altinda 5 saniyelik sureyi 431 ms asti. Test tek basina 1,9 saniyede ve tam
  set 2 worker ile 441/441 gecti; davranis regresyonu bulunmadi.

## 2026-07-28 - Faz 7.3 bayi siparis ve sevkiyat UX

- `/bayi/siparisler` teknik durum listesi yerine `Incelemede`,
  `Hazirlaniyor`, `Yolda` ve `Gecmis` operasyon gruplarini ve sayilarini
  gosterir.
- Arama siparis numarasinin yaninda sevkiyat takip numarasini da destekler;
  sorgu her zaman oturumdan gelen `companyId` ile sinirlidir.
- Her siparis satiri mevcut durumu, kullanicinin beklemesi gereken sonraki
  adimi, istenen teslim tarihini ve varsa tasiyici/takip bilgisini aciklar.
- Siparis detayinda ayni merkezi durum sozlesmesinden uretilen `Su anda ne
  oluyor?` alani bulunur.
- Tarih araligi Istanbul gun sinirlarina gore cozulur; gecersiz veya ters
  aralik kullaniciya acik hata olarak doner.
- Mobil operasyon sekmeleri dokunmatik kaydirilabilir, fakat gorunur sistem
  scrollbar'i arayuzu bozmaz. Metrik aciklamalari kesilmeden satira kirilir.
- Yerel kabul: 19/19 Node, 436/436 Vitest, 52 authenticated smoke, lint,
  typecheck, 41 migration integrity, production build ve 360/390/768/1024/1440
  px browser QA basarili; tarayici hata/uyari gunlugu bostur.

## 2026-07-27 - Faz 7.2C fiziksel stok sayimi

- `/admin/stok/sayimlar` urun/depo secimi, acik sayimlar ve son 20 terminal
  kaydi tek operasyon alaninda toplar.
- Sayim acilisinda fiziksel miktar, rezerve miktar, stok guncelleme surumu ve
  son hareket sira numarasi snapshot olarak saklanir.
- Sayim sonucu fiziksel stogu guncellerken rezerve miktari degistirmez; sifir
  fark dahil her uygulanan sayim `INVENTORY_COUNT` kaniti olusturur.
- Oturum sirasinda bakiye degismisse veya sayilan miktar aktif rezervasyonun
  altindaysa sonuc kaybolmaz; stok ezilmeden `STALE / Inceleme gerekli`
  terminal kaydi olarak saklanir.
- Ayni stokta tek acik oturum, aktor/payload bagimli idempotency, ortak stok
  kilidi, optimistic CAS, audit ve append-only terminal korumasi veritabani
  seviyesinde tamamlandi.
- Yerel kabul: 19/19 Node, 431/431 Vitest, 52 authenticated smoke, lint,
  typecheck, 41 migration integrity, production build ve 390/1280 px browser
  QA basarili.

## 2026-07-27 - Faz 7.2B atomik depo transferi

- Depolar arasi transfer ayrik `StockTransfer` ana kaydi ve
  `/admin/stok/transferler` operasyon ekraniyla tamamlandi.
- Transfer yalniz fiziksel stoktan rezerve miktar dusuldukten sonra kalan
  kullanilabilir bakiyeden yapilir; siparise ayrilmis stok kaynak depoda kalir.
- Kaynak azalis, hedef artis, iki append-only hareket kaydi, transfer kaydi ve
  audit tek transaction icinde tamamlanir veya birlikte geri alinir.
- Tamamlanmis transfer kaynak/hedef stok satirlari ile `TRANSFER_OUT` ve
  `TRANSFER_IN` hareketlerine foreign key ile baglidir.
- Ayni islem anahtari ve ayni aktor/payload guvenli replay uretir; farkli
  payload veya aktor catisma olarak reddedilir.
- Siparis rezervasyonu, siparis durum islemleri, teklif donusumu, manuel/toplu
  stok, urun aktarimi ve depo yonetimi ortak `stock-mutations` kilit sirasina
  baglandi.
- Eslestirilmis transferler append-only SQLite tetikleyicileriyle
  degistirilemez ve silinemez.
- Tek aktif depo durumunda bos hedef secimi yerine ikinci aktif depoyu
  olusturma gorevi gosterilir.
- Yerel kabul: 19/19 Node, 418/418 Vitest, 51 authenticated smoke, lint,
  typecheck, 40 migration integrity, production build ve 390/1280 px browser
  QA basarili.

## 2026-07-27 - Faz 7.2A depo ana verisi

- Depo kodu, adi, aktiflik ve adres bilgileri veritabaninda `Warehouse` ana
  verisi olarak tanimlandi.
- Mevcut 1.384 stok satiri `MERKEZ` deposuna geriye donuk baglandi; bilinmeyen
  depo koduyla stok yazimi veritabani foreign key kuraliyla engellenir.
- Urun ve stok formlarindaki serbest depo metni kaldirildi. Yeni stok kaydi ve
  toplu fiyat/stok aktarimi yalniz aktif depo secimiyle calisir.
- `/admin/stok/depolar` calisma alani depo olusturma, adres guncelleme ve
  aktiflik yonetimini tek yerde toplar.
- Depo yonetimi ayri `warehouse.manage` yetkisine baglandi. Salt stok okuma
  yetkisi stok degistirme veya depo yonetme kontrolu gostermez.
- Stok veya rezervasyon bakiyesi bulunan depo devre disi birakilamaz; son aktif
  depo kapatilamaz. Guncellemeler optimistic concurrency ve audit kaydiyla
  korunur.
- Yerel kabul: 19/19 Node, 407/407 Vitest, 50 authenticated smoke, lint,
  typecheck, production build, migration integrity ve 390/1280 px browser QA
  basarili.
- Faz 7.2B atomik depo transferi ve Faz 7.2C sayim oturumu sonraki paketlerdir.

## 2026-07-27 - Faz 7.3 entegrasyon ve CMS operasyon UX

- Entegrasyon ekrani teknik telemetri listesi yerine kullanicinin tamamlamasi
  gereken tek birincil gorevi ve operasyon etkisini gosterir.
- Basarisiz olaylar, geciken tekrar denemeler, scheduler sagligi ve manuel City
  Lojistik sevkiyatlari ayni oncelik kuraliyla siniflandirilir.
- Manuel City Lojistik sayaci tum siparislere degil, dogrudan ilgili
  siparislere filtreli bir calisma alanina gider.
- Entegrasyon olaylari mobilde yatay tablo yerine okunabilir kayit kartlarina
  donusturuldu; ham olay kimlikleri kapali teknik ayrintida tutuldu.
- Tekrar deneme islemi neden, etki, yetki ve olasi mukerrer teslimat riskini
  kaydetmeden once aciklar.
- Icerik yonetimi banner metni, gorsel ve canli kayitli onizleme olmak uzere
  iki adimli yayin gorevine donusturuldu.
- Banner gorseli bilgisayardan secilir; dosya adi, boyutu ve merkez kirpma
  onizlemesi yayinlamadan once gorulur. Ag hatasinda yukleme ekrani beklemede
  kalmaz.
- Teknik CMS sayfa kayitlari varsayilan olarak kapali ve salt okunur envanter
  olarak ayrildi.
- Yerel kabul: 19/19 Node, 397/397 Vitest, 49 authenticated smoke, lint,
  typecheck, production build ve 390/1440 px browser QA basarili.

## 2026-07-27 - Faz 7.3 firma ve bayi basvurusu UX

- Firma detayinda portal erisimi, bayi kullanicilari ve ticari politika tek
  operasyon ozetinde gorunur; sistem kayit durumuna gore tek sonraki gorev
  onerir.
- Ticari kosul ve kullanici ekleme formlari varsayilan olarak kapali gorev
  alanlarina alindi; yogun mobil sayfa sadelestirildi.
- Bayi basvuru UI'i yalniz server state machine'in izin verdigi durumlari
  sunar. Durum gecis kurali tek domain modulunden okunur.
- Onay, red, bilgi bekleme ve inceleme secimleri kaydetmeden once gercek
  etkilerini ve birincil aksiyonu gosterir.
- Onaylanmis basvurular tekrar karara acilmaz; firma kullanicisi aktivasyonu
  icin dogrudan firma detayina yonlenir.
- Davet bekleyen kullaniciyi devre disi birakan fakat `Askiya al` yazan hatali
  cift aksiyon kaldirildi; hedef durum, onay ve sonuc geri bildirimi
  birlestirildi.
- Mobilde karar alani islem gecmisinden once gelir. Ham rol, durum ve audit
  kodlari yerine Turkce operasyon etiketleri kullanilir.
- Yerel kabul: 19/19 Node, 393/393 Vitest, 47/47 authenticated smoke, lint,
  typecheck, production build ve 390/1440 px browser QA basarili.

## 2026-07-27 - Faz 7.3 otomatik stok durumu

- Stok seviyesi manuel secim olmaktan cikarildi ve fiziksel/rezerve sayaclarin
  otomatik sonucu haline getirildi.
- Kullanilabilir miktar 0 ise `Rezerve`, 1-3 ise `Az stok`, 4 ve uzeri ise
  `Stokta`; fiziksel miktar 0 ise `Stok yok` olarak hesaplanir.
- Urun olusturma ve stok duzeltme formlari sayi girildikce sonucu canli
  gosterir; server istemciden stok durumu kabul etmez.
- Toplu fiyat/stok aktarimi, siparis rezervasyonu, iptal, sevkiyat, ana sayfa,
  katalog ve stok raporu ayni domain fonksiyonunu kullanir.
- `20260727090000_derive_stock_status` migration'i mevcut veriyi duzeltti ve
  dogrudan veritabani yazimlarinda da durumu otomatik tureten tetikleyicileri
  ekledi.
- Yerel veritabaninda 1.384 stok satirinda algoritma uyumsuzlugu `0`.
- Urun stok ekrani Turkce metinleri ve hesaplanan durum anlatimi sadeleştirildi.
- Yerel kabul: 19/19 Node, 389/389 Vitest, 47/47 authenticated smoke, lint,
  typecheck, migration integrity, production build ve 390/1265 px browser QA
  basarili.

## 2026-07-27 - Faz 7.3 gorev odakli UX paketi 3

- Stok ve depo ekrani teknik rapor girisi yerine riskli stogu bulma ve
  duzeltme gorevine odaklandi.
- Fiziksel, rezerve ve kullanilabilir stok kavramlari ile islemin onerilen ilk
  adimi ayni ekranda aciklandi.
- Stok hareket defteri ana akistan kaldirilmadan kapali ileri seviye kontrole
  tasindi.
- Mobil stok gorunumu yatay teknik tablo yerine her urunun depo ve miktar
  ozetini veren dokunmatik kayitlara donusturuldu.
- Stok sayfalamasinin raporlar rotasina gecmesi duzeltildi ve regresyon testi
  eklendi.
- Yayin hazirligi fiyat, stok ve yayin adimlariyla yeniden siralandi; islemin
  ana sayfa ve bayi kataloguna etkisi gorunur hale getirildi.
- Eksik urunler fiyat veya stok sekmesine dogrudan duzeltme aksiyonu sunar;
  hazir urunler ayri filtreyle toplu yayina alinabilir.
- Admin genelinde devre disi ana butonlar artik aktif marka renginde gorunmez.
- Yerel kabul: 19/19 Node, 387/387 Vitest, 47/47 authenticated smoke, lint,
  typecheck, production build, 390 ve 1440 px browser QA; yatay tasma ve
  console hatasi yok.

## 2026-07-24 - Faz 7.3 gorev odakli UX paketi 2

- Limitli kredi politikasinda acik siparis riski ve yeni sepet toplami ayni TRY
  exposure sozlesmesiyle hesaplanir.
- Limit asan veya ticari politikasi tanimsiz siparisler normal `SUBMITTED`
  yerine `WAITING_FOR_APPROVAL` durumunda olusur. Stok ayrilir ancak ticari onay
  verilmeden hazirlik baslamaz.
- Limitsiz kredi politikasinda siparis normal akisla ilerler ve arayuzde
  `Limitsiz` olarak acikca gosterilir.
- Sepet; kredi limiti, acik siparis riski, siparis sonrasi risk, asim tutari ve
  vadeyi gonderimden once gosterir.
- Fiyati eksik, stogu yetersiz veya farkli para birimli sepet server isteginden
  once bloke edilir ve nedeni kullaniciya anlatilir.
- Urun sepete eklendiginde sayfa degismez; animasyonlu basari bildirimi ve
  veritabani kaynakli canli sepet adedi guncellenir.
- Sepete eklemede dinamik sayfalari gereksiz yere yeniden dogrulayan cache
  invalidasyonlari kaldirildi; Server Action yaniti ve animasyon tek tiklamada
  tamamlanir.
- `Stok sorunuz` dili `Stok teyidi gerekli` olarak; `Odeme kosulu` dili
  `Vade (odeme suresi)` olarak duzeltildi.
- Admin ve bayi menulerinde tiklama aninda navigation progress gorunur; kritik
  hedefler onceden getirilir.
- Admin dashboard stok/siparis aksiyonlarindaki yanlis metrik indeksleri ve
  stok hedef rotasi duzeltildi.
- Yerel kabul: 19/19 Node, 386/386 Vitest, 47 authenticated HTTP smoke,
  production build ve 390 px gercek browser akisi basarili. Limitli ve limitsiz
  kredi, sayfada kalan sepete ekleme, animasyon, canli sayac ve yatay tasma
  ayri ayri dogrulandi.

## 2026-07-24 - Faz 7.3 gorev odakli UX paketi 1

- `docs/ux/task-oriented-ux-contract.md` tum admin, bayi ve ticaret ekranlari icin ortak anlasilabilirlik sozlesmesi olarak eklendi.
- Fiyat yonetiminde firma/grup liste teknigi ana akistan kaldirildi; istisna listeleri kapali gelismis gorevlere donusturuldu.
- Toplu zam veya indirim artik fiyatlari dogrudan degistirmez. Once eski/yeni fiyatlari gosteren 24 saatlik onizleme olusturur, ikinci onaydan sonra atomik uygulanir ve geri alinabilir.
- Urun yonetiminde yeni urun ve Excel aktarimi kapali ikincil gorevlere tasindi; fiyat, stok ve yayin islemleri kendi operasyon ekranlarina yonlendirildi.
- Katalog kartlari ve urun detayi, fiyati veya kullanilabilir stogu olmayan urunu siparise uygun gostermiyor.
- City Lojistik canli adapteri hazir olmadigi icin checkout seceneklerinden kaldirildi; entegrasyon durumu acikca belirtiliyor.
- Admin cikisi admin girisine doner; public ana sayfadaki admin oturumu bayi girisi yerine yonetim paneline yonlenir.
- Ana commerce logosu masaustu, tablet ve mobilde daha kompakt olculere cekildi.

## 2026-07-24 - Faz 7.1 fiyat operasyonu ve Faz 7.2 stok operasyonu

- Fiyat yonetimi teknik fiyat listesi modelinden gorev odakli akisa sadeleştirildi.
- Ana ekranda yalniz Excel ile urun fiyati guncelleme, firma iskontosu ve toplu zam/indirim islemleri one cikarildi.
- Firma/grup ozel listeleri ve teknik liste ayarlari kapali `Gelismis fiyat ayarlari` alanina tasindi; islevler kaldirilmadi.
- Kullaniciya gosterilen hesaplama dili `ana bayi fiyati - firma iskontosu = siparis fiyati` olarak sabitlendi.
- Fiyat kavramlari `liste fiyati`, `firma iskontosu` ve `siparis fiyati` olarak ayrildi.
- Fiyat onceligi firma listesi, musteri grubu listesi ve genel liste seklinde aciklandi.
- Ticari kosullar kullaniciya degil firmaya atanir; ayni firmadaki bayi kullanicilari ayni kosullari gorur.
- `.xlsx` fiyat sablonu urun kodu ve mevcut fiyatlarla indirilebilir.
- Excel dosyasi canli veriye dokunmadan once satir bazinda onizlenir; hatali dosya uygulanmaz.
- Fiyat aktarimi ve toplu artis/azalis tek transaction icinde calisir, audit partisi olusturur ve guvenli geri alma sunar.
- Dolu fiyat listesinin para birimi veya kapsami degistirilemez.
- `/admin/stok` ayri operasyon rotasi olarak acildi; risk, rezervasyon, mutabakat, toplu aktarim ve hareket defteri baglantilari bir aradadir.
- Coklu depo kaydinda yanlis satirin surum bilgisinin gonderilmesi duzeltildi.
- Yerel kabul: 19/19 Node, 386/386 Vitest, 47 authenticated HTTP smoke, lint, typecheck, production build, release yasam dongusu demosu ve 0 production dependency vulnerability.
- 1440 px masaustu ile 390 px mobil fiyat/stok ekranlarinda yatay tasma ve browser console hatasi bulunmadi.
- Depo ana verisi, depolar arasi transfer ve sayim oturumu Faz 7.2'nin kalan kapsamidir.
- ERP, City Lojistik canli adapteri ve urun gorsel otomasyonu Faz 9'a ertelendi.

## 2026-07-24 - Faz 7 UI ve yayin kabul durumu

- Onayli PDF logodan keskin SVG logo ve marka isareti uretildi; kirpilmis JPEG ve dusuk cozunurluklu ICO sunumu kaldirildi.
- Commerce, admin ve bayi navigasyonu ayni cam malzeme diline tasindi.
- Mobil menuler backdrop, Escape, focus siniri, focus iadesi ve body scroll lock destekleyen ortak drawer davranisina baglandi.
- Admin ic ice rotalarda birden fazla aktif menu gorunmesi engellendi.
- 1024 px'te genis sidebar yerine drawer kullaniliyor; 1280 px ve uzerinde kompakt sabit sidebar aciliyor.
- Bayi dashboardu ticari komuta bandi, KPI ve hesap ozetiyle guclendirildi.
- CMS hero gorseli CSS background yerine optimize `next/image` hattindan sunuluyor.
- `npm run demo:release` siparis, rezervasyon, sevkiyat stok dusumu, teslim, audit/history ve sekiz transactional e-posta outbox teslimini izole veritabaninda kanitliyor.
- Yerel kabul kapilari: 19/19 Node, 380/380 Vitest, 44/44 authenticated smoke, lint, typecheck, production build ve 0 production dependency vulnerability.
- Gercek SMTP inbox teslimi ve canli yayin; SMTP, hosting, DNS/TLS, kalici storage, scheduler ve monitoring bilgileri gelmeden tamamlanmis sayilmayacak.

Son guncelleme: 2026-07-24

## Yerel Kabul Sunucusu

- Kullanici kabul adresi `http://localhost:3000` optimize `next start` modunda calisir.
- Development gerektiğinde ayri `.next-dev` dizini kullanilir; dev derleme sureleri kullanici hiz kabulunun parcasi degildir.
- Admin/bayi sidebar kaydirmasi gorunur sistem scrollbar'i olmadan mouse, touchpad ve klavye ile calisir.
- Admin, bayi ve urun rotalarinda anlik loading sinirlari vardir; paylasilan shell gezinme sirasinda etkilesimli kalir.
- Session DAL ayni React render gecisinde tekrarlanan DB okumalarini tekillestirir.

## Local Gelistirme Cikti Izolasyonu

- `next dev` `.next-dev`, production build ve `next start` `.next` dizinini kullanir.
- Bu ayrim acik localhost sunucusunun production build sonrasinda eski/eksik CSS ve JavaScript asset'i sunmasini engeller.
- Aktif yerel adres: `http://localhost:3000`.

## Faz 6 UI Durumu

- Premium responsive UI fazi tamamlandi.
- Uygulama `ekolglass.com` kurumsal sitesinden baglanilan B2B satis portali olarak konumlandi.
- Public ticaret rotalari, bayi calisma alani, admin operasyon merkezi ve credential ekranlari ortak EkolGlass marka sistemi kullaniyor.
- Admin dashboard CMS/banner yukunden ayrildi; banner dosya yukleme ve icerik ayarlari `/admin/icerik` altinda.
- Responsive tarama 360, 390, 768, 1024 ve 1440 px genisliklerde yatay tasmasiz tamamlandi.
- Son yerel kapilar: 19/19 Node, 380/380 Vitest, 44/44 authenticated smoke, lint, typecheck, production build ve production audit basarili.

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `3a137e3 fix: remove vulnerable npm tooling from runtime image`
  - `9923aad feat: add immutable production release pipeline`
  - `12a9912 feat: enforce commercial and CMS mutation integrity`

## Calisan Temel Parcalar

- Faz 5 Paket 4 repo ici deployment zinciri: digest-pinned OCI container, GHCR registry digest, SBOM/provenance/attestation ve release manifesti.
- Container preflight, SQLite release-oncesi backup, migration integrity, migration deploy ve son integrity tamamlanmadan trafige acilmaz.
- Makinece dogrulanabilir rollback manifest semasi ve validator.
- Production preflight gercek CLI giris noktasi ve LOCAL medya kalici volume sozlesmesi testlidir.
- Faz 5 Paket 4 GitHub quality ve release-artifact CI kabulu ile tamamlandi; UI yenileme kapisi acildi.

- Next.js App Router uygulamasi.
- Prisma 7 + SQLite lokal veritabani.
- Seed verisi.
- Admin login:
  - `admin@ekolglass.local`
  - lokal fallback sifre: `EkolGlass2026!`
- DB session ve httpOnly cookie.
- Admin route guard.
- Audit log modeli ve kritik admin action loglari.
- Public ana sayfa.
- Oturum duyarlı, CMS banner'li public ticaret ana sayfasi.
- Public urun kesfi: `/urunler`.
- Guest ve bayi icin ortak urun ticaret alani: `/urunler`.
- Eski `/bayi/urunler` ve `/bayi/teklif-sepeti` rotalarinda kalici yonlendirme.
- Bayi ve ic ekip icin ayrilmis giris akislari.
- Public sitemap ve private route robots/noindex politikalari.
- Bayi basvuru formu.
- Admin bayi basvurusu liste/detay ekranlari.
- Permission kontrollu bayi inceleme ve durum gecis akisi.
- Onaydan transaction tabanli firma ve `DEALER_OWNER/INVITED` kullanici uretimi.
- Musteri grubu, odeme kosulu ve kredi limiti atamasi.
- `/admin/firmalar` liste/detay ve aktivasyon daveti yonetimi.
- `/aktivasyon/[token]` ilk parola ve hesap aktivasyonu.
- Admin firma detayinda ek bayi kullanicisi olusturma, askilama, yeniden etkinlestirme ve soft devre disi birakma.
- Firma duzeyinde gerekceli askilama/yeniden etkinlestirme; askida tum bayi session ve acik credential tokenlarini atomik iptal.
- Ayri hash token modeliyle iki saatlik tek kullanimlik `/parola-sifirla/[token]` akisi.
- Askilama ve parola yenilemede tum aktif oturumlarin iptali.
- Dealer login role-based `/` yonlendirmesi; firma kimligi header'da gorunur.
- Merkezi dealer context: ACTIVE dealer + APPROVED company.
- Bayi operasyon dashboardu ve responsive bayi shell.
- Bayi siparis, teklif ve firma hesap ekranlari.
- Public ve bayi urun detay ekranlari; aktif medya, teknik ozellik ve uyumluluk gorunumu.
- Kullanici+firma kapsamli kalici teklif sepeti.
- Gonderim aninda DB'den yeniden fiyatlanan, fiyat kaynagi/kademe snapshot'li teklif talebi.
- Teklif sepetinde version/CAS, company-scoped idempotency, canonical request hash ve atomik tuketim korumasi.
- Company-scoped teklif detay ve tekrar erisilebilir basari ekrani.
- Admin teklif kuyrugu, detay, immutable teklif revizyonlari ve role ayrilmis durum gecisleri.
- Onaylanan tekliften aktif revizyon fiyatlarini koruyan idempotent siparis donusumu ve stok rezervasyonu.
- Teklif, revizyon, siparis ve siparis kalemi arasinda iliskisel kaynak/audit zinciri.
- Company-scoped order/quote DAL ve cross-company SQLite testi.
- Kullanici+firma kapsamli kalici siparis sepeti ve `/sepet` checkout ekrani.
- Siparis server action'larinda dealer redirect siniri ve yalniz beklenen `OrderCartError` mesajlarini aciga cikaran hata sozlesmesi.
- Teslimat adresi secimi ve checkout icinden yeni firma adresi olusturma.
- Gonderim aninda server-side fiyat, firma, kullanici, urun ve stok yeniden dogrulamasi.
- Cart version, company-scoped idempotency ve request hash ile cift/stale gonderim korumasi.
- Transaction icinde deterministik coklu depo stok rezervasyonu ve fiyat/urun/adres snapshot kayitlari.
- Bayi siparis detay, durum gecmisi ve sevkiyat takip ekrani.
- Admin siparis liste, filtre, firma/bayi, teslimat, kalem ve rezervasyon detay ekranlari.
- Admin siparis durum gecis matrisi ve role ayrilmis review/approve/fulfill/ship/deliver/cancel yetkileri.
- Monoton siparis version'i ve idempotent `OrderTransitionCommand` ile cift gonderim korumasi.
- `ON_HOLD` siparisin yalnizca bekletildigi asamaya geri donmesi.
- Iptalde rezervasyon release; sevkte fiziksel stok + rezervasyon consume; teslimde ikinci stok etkisi olmamasi.
- Fiziksel/rezerve stok sayaclari ve rezervasyon yasam dongusu icin SQLite `CHECK` constraint'leri.
- Admin stok formlarinda rezervasyon sayacinin salt okunur tutulmasi; sayac yalniz siparis ledger'i tarafindan degisir.
- Durum history kaydinda islemi yapan kullanici ve audit metadata'sinda stok once/sonra degerleri.
- Admin listesinde depo rolunden fiyat, muhasebe rolunden rezervasyon detayinin gizlenmesi.
- DB seviyesinde firma/musteri grubu fiyat izolasyonu.
- Admin dashboard temeli.
- Admin shell:
  - Sol menu
  - Ust bar
  - Mobil menu
  - Operasyon dashboard
- Admin CMS ayar ekrani.
- CMS ayarlarinda sabit anahtar allowlist'i, `isEditable`/tip kontrolu, stale-form CAS ve transaction ici audit.
- Banner medyasinda atomik DB/audit, benzersiz sahiplikli object key ve basarisiz transaction storage telafisi.
- Fiyat listesi, urun fiyati ve firma ticari kosullarinda stale-form ve audit rollback korumasi.
- Admin urun/kategori/fiyat/stok yonetimi.
- Admin urun liste arama/filtre/sayfalama.
- Admin kategori yonetimi alt ekrani: `/admin/urunler/kategoriler`.
- Admin fiyat listesi alt ekrani: `/admin/urunler/fiyat-listeleri`.
- Admin urun detay sayfasi.
- Admin urun detayinda stok/fiyat guncelleme formlari.
- Fiziksel/rezerve delta, once/sonra bakiye, aktor, gerekce ve kaynak snapshot'li append-only stok hareket defteri.
- Manuel stok, fiyat/stok CSV, urun paketi, seed, rezervasyon, teklif donusumu, iptal ve sevkiyatta transaction ici hareket kaydi.
- Rezervasyon, teklif donusumu, iptal ve sevkiyatta fiziksel/rezerve bakiyeden transaction ici stok durumu turetimi.
- `/admin/raporlar?view=stock-movements` filtreli stok hareketleri ve stok sayaci/hareket defteri mutabakati.
- Admin urun detayinda medya/teknik dosya ekleme ve guncelleme.
- Admin urun detayinda medya/teknik dosya soft aktif/pasif yonetimi.
- Admin urun detayinda uyumluluk/OEM ekleme ve guncelleme.
- Admin urun detayinda uyumluluk/OEM duplicate engeli ve audit log'lu silme.
- Public katalog arama/filtre.
- Public katalogda role-based fiyat/stok gorunurlugu.
- Public katalogda OEM/uyumluluk kayitlari uzerinden arama.
- Catalog server action testleri:
  - Uyumluluk duplicate engeli
  - Uyumluluk silme sahiplik kontrolu
  - Uyumluluk audit/revalidation
- Arka plan Codex advisor rapor hatti:
  - `scripts/codex-advisor.ps1`
  - `docs/agent-reports/`
- City Lojistik adapter siniri, canli API bilgisi bekliyor.
- Lease/retry/dead-letter destekli transactional entegrasyon outbox'i.
- Siparis ve teklif transaction'larindan versiyonlu outbox olaylari.
- Permission kontrollu `/admin/entegrasyonlar` operasyon ekrani.
- Idempotent ve audit log'lu dead-letter replay/retry-now komutlari.
- Backlog, expired lease, dead-letter ve isleyicisiz topic durumlarini kapsayan outbox health metrigi.
- B2B portalinda yalniz dogrudan siparis akisi; yeni teklif olusturma kapali.
- Bayi tarafinda gecmis teklif kayitlari salt okunur audit arsivi olarak
  korunuyor; admin yalniz kapanmamis eski kayitlari sonuclandirabiliyor.
- Ekol UTF-8 genel listesinden 1.379 kod bazli taslak urun ice aktarildi.
- Net fiyat kapsami: firma, musteri grubu, genel bayi sirasi.
- Banner icin dosya secimli, MIME imzasi kontrollu lokal medya storage hatti.
- Lokal ve S3/R2 medya storage adapteri; gercek bucket erisimini sinayan production readiness kapisi.
- LOCAL/S3 provider ayrimli, S3 pagination ve nesne sinirli salt okunur medya reconciliation.
- Urun detayinda fiyat ve stok kontrollu yayin hazirligi ile yayina al/yayindan kaldir komutu.
- `/admin/urunler/yayin-hazirligi` ekraninda taslak urun KPI, arama, kategori/hazirlik filtresi ve sayfalama.
- Fiyat ve stok kosullarini transaction icinde yeniden dogrulayan, 50 urun sinirli atomik toplu yayin komutu.
- Toplu yayinda urun bazli audit kaydi ve stale/eksik secimde fail-closed davranis.
- Tekil yayinda transaction ici readiness, kosullu durum gecisi ve ham altyapi hatasi sizdirmayan fail-closed davranis.
- Yayin icin pozitif, genel kapsamli ve `minQuantity=1` standart bayi fiyati zorunlulugu.
- Admin urun CSV importunda kategori, urun, ilk stok ve audit yazimlarinin tek transaction'da tamamlanmasi.
- Yayin ve urun importu icin gercek SQLite trigger tabanli rollback kanitlari.
- Firma iskontolu standart bayi fiyatinin checkout `unitPrice`, `lineTotal` ve `COMPANY_DISCOUNT` snapshot kaniti.
- Genel bayi baz fiyati uzerine firma kartindan yuzdesel musteri iskontosu.
- Stok gorunurlugu ve rol/durum kodlari icin Turkce kullanici etiketleri.
- Login hatalari JSON audit sayimi yerine indeksli `AuthLoginFailure` modelinden e-posta + guvenilir IP bazinda sinirlanir.
- Bayi basvurusu atomik HMAC e-posta/IP bucket'lari ve claim-token duplicate kilidiyle korunur.
- Aktivasyon ve parola sifirlama token, flow-IP ve ortak global IP bucket'lariyla rotating-token saldirisini sinirlar.
- Production credential/public form akislari guvenilir client IP eksiginde fail-closed davranir; raw IP/token limiter veya failure audit kaydina yazilmaz.
- Rate-limit anahtarlari HMAC'lidir; production secret ve proxy guven siniri fail-closed uygulanir.
- Bilinmeyen hesaplarda dummy bcrypt karsilastirmasi ile zamanlama farki azaltilir.
- Bearer secret korumali rate-limit maintenance endpoint'i, CLI scheduler komutu ve audit kaydi.
- `/api/health` authentication durumu ve admin dashboard `Giris guvenligi` metrigi.
- Alarm webhook HMAC/timeout/redirect siniflandirmasi ile reminder, recovery ve yeniden escalation regresyon kapsami.
- Runtime testlerine ek olarak bagimsiz `tsc --noEmit` test tipi kapisi.
- Admin dashboard ve katalog mutation'larinda permission-bazli fail-closed yetki kapilari.
- Production response'larinda HSTS, CSP frame/base/form sinirlari, nosniff, referrer, frame ve permissions policy basliklari.
- Production preflight'ta mutlak kalici SQLite yolu, temiz ayni-origin scheduler URL'leri ve dogrulanmis proxy/IP header sozlesmesi.
- LOCAL medya storage icin gercek okuma/yazma readiness kontrolu.
- Offsite backup upload timeout'u ve database/manifest aktarimi arasinda lease heartbeat kontrolu.
- Release bazli doldurulabilir production kabul kanit sablonu.
- Runtime commit/digest/release kimligiyle deploy edilen artifact'i dogrulayan secret-safe public production evidence collector ve manuel GitHub workflow'u.
- Public evidence icin onayli DNS hedefi, public IP, HTTP->HTTPS, en az 30 gun TLS, health no-store ve kati robots/sitemap kapilari.
- CI'da gercek migration+seed kullanan, kaynak DB'yi degistirmeyen ve artifact ureten izole backup/restore tatbikati.
- Public evidence collector'da secret okumadan bes dahili cron rotasinin `401`, no-store, request ID ve cookie uretmeme siniri.
- Authenticated smoke'un yalniz izole CI/staging veritabaninda calisabilecegi production guvenlik siniri.
- Fiziksel `.env` dosyasina bagimli olmayan scheduler/backup/medya CLI komutlari.
- Production preflight zorunlu baslangic komutu, bagimsiz typecheck CI kapisi ve tek kullanimlik bos-veritabani ilk admin bootstrap'i.

## En Onemli Eksikler

1. Bayi platformunda kalanlar:
   - Transactional e-posta adapteri hazir; production SMTP credential ve scheduler kurulumu bekliyor.
   - Kontrollu fiyat/stok preview ve onayli import hatti tamamlandi; gercek ERP kolon eslestirmesi bekliyor.
   - Firma ve kullanici yasam dongusu detay/action seviyesinde testli; kritik hesap islemleri icin yeniden kimlik dogrulama urun karari bekliyor.

2. Urun ve stok yonetiminde cekirdek sayaç kapsami tamamlandi:
   - Fiziksel/rezerve stok sayaclari, turetilen stok durumu, rezervasyon defteri ve append-only hareket defteri birlikte mutabakat uretiyor.
   - Tekil fiyat, CMS ve firma ticari kosullari transaction ici audit ve
     stale-form korumasi kullaniyor. Medya/kategori/uyumluluk yazimlarinin
     audit atomikligi kalan kapanis isidir.

3. Teklif/siparis akisinda kalanlar:
   - Tekliften siparise donusum kredi/vade/risk snapshot kapisina baglandi ve
     tuketicisiz outbox olayi kaldirildi.
   - SMTP teslim ve outbox operasyon hatti hazir; production credential, scheduler ve alarm kanali kurulumu bekliyor.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

5. Bagimsiz B2B portal yayin siniri kesinlesti ama production kurulumu yapilmadi:
   - Mevcut kurumsal site ve admin korunacak.
   - Kurumsal siteye yalniz masaustu/mobil `Bayi Portali` butonu eklenecek.
   - Portal hostu, DNS/TLS ve bagimsiz deployment runbook'u kesinlestirilecek.

## Bir Sonraki Dogru Adim

Yerel UI ve release kabulunden sonra production kurulumu tamamlanacak:

- Dependency audit'teki Excel/brace-expansion ve Prisma/valibot zinciri
  uyumlu bir surum veya guvenli kutuphane degisikligiyle kapatilacak; CI
  yesile donmeden release artifact kabul edilmeyecek.
- Kalan yogun ikincil admin/bayi ekranlari Faz 7 tasarim sistemiyle kademeli sadelestirilecek.
- Degismez deployment artifact'i ve rollback manifesti secilen platformda uygulanacak.
- Production credential, DNS/TLS, SMTP, scheduler ve merkezi log sink dis kabul listesi.
- Gercek ortamda backup restore ve S3/R2 medya upload/read/reconciliation provasi.

City Lojistik canli adapteri, resmi API sozlesmesi gelene kadar kapsam disinda ve fail-closed kalir.
