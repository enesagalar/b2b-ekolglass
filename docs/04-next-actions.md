# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## 2026-07-16 - Provider-neutral sistem alarm teslimi

Tamamlananlar:

- `SystemAlertState` ile warning, critical, escalation, reminder ve recovery yasam dongusu.
- State version + transactional outbox idempotency ile paralel evaluator deduplication.
- E-posta worker'indan bagimsiz `system.alert.notification.v1` teslim worker'i ve scheduler endpoint'i.
- HTTPS/443 host allowlist, private IP literal reddi, redirect kapisi, timeout ve HMAC-SHA256 imzasi.
- `408/425/429/5xx` retry, kalici `4xx` dead-letter ve audit izli replay sozlesmesi.
- Production preflight'ta ayri secret, URL, allowlist, timeout ve scheduler esik kontrolleri.
- Admin entegrasyon ekraninda hesaplanan sagliktan ayri provider hazirligi, alarm olayi, kuyruklama ve teslim gorunurlugu.
- Tum scheduler runner'larinda tek satir kontrollu JSON, sure, HTTP durum ve correlation ID cikisi.
- 32 migration, 62 test dosyasi ve 266 test, lint, uyarisiz production build, 42 adimli smoke ve 1440/390 px browser QA basarili.

Production aktivasyon kapisi:

1. Webhook receiver/saglayici secilecek; idempotency, HMAC timestamp ve replay reddi staging'de kanitlanacak.
2. Scheduler platformunda `SYSTEM_ALERT_DISPATCH` icin bagimsiz non-zero/dead-man alarmi kurulacak.
3. Stdout/stderr JSON akisi icin merkezi log sink secilip event/correlation indeksleri acilacak.
4. Backup bundle'lari farkli failure domain'e sifreli aktarilacak.
5. City Lojistik API sozlesmesi geldiginde canli adapter kabulune gecilecek.

## 2026-07-16 - Backup heartbeat, alarm seviyesi ve retention

Tamamlananlar:

- Database backup icin ayri secret'li internal scheduler endpoint'i ve korelasyonlu CLI runner.
- Backup'a ozel lease, suresi dolmus worker fencing'i ve publish oncesi heartbeat checkpoint'i.
- Database ile manifesti tek dizin rename'iyle yayinlayan atomik backup bundle modeli.
- Scheduler basarisindan once izole restore provasi.
- Warning/critical heartbeat seviyeleri, ardisik hata esigi ve admin teshis alanlari.
- Basarili run icin 14 gun, hatali run icin 90 gun batch retention isi.
- Scheduler bileseni arizasini veritabani arizasi gibi gostermeyen operational health siniflandirmasi.
- Production preflight'ta backup root, secret, HTTPS origin, lease/esik ve retention kontrolleri.
- Gercek scheduler cagrisinda 2.269.184 baytlik atomik backup bundle'i uretildi; SHA-256, 31 migration, sifir foreign key ihlali ve izole restore provasi dogrulandi.
- 58 test dosyasi ve 247 test, lint, uyarisiz production build, 42 adimli authenticated smoke ve 1440/390 px browser QA basarili.

Sonraki teknik paket:

1. Merkezi log sink ve alarm kanali saglayicisini secmek.
2. Backup bundle'larini farkli failure domain'e sifreli aktarmak.
3. Staging scheduler zamanlamalarini ve alarm teslimini kanitlamak.
4. City Lojistik API sozlesmesi geldiginde canli adapter kabulune gecmek.

## 2026-07-16 - Gozlemlenebilirlik ve scheduler heartbeat

Tamamlananlar:

- Sunucu tarafindan uretilen korelasyon kimligi ve `x-request-id` cevap standardi.
- Hassas veri maskeleyen, boyut sinirli tek satir JSON logger.
- Next.js `onRequestError` instrumentation kaydi.
- Outbox ve giris guvenligi bakimi icin kalici run history, heartbeat ve atomik lease modeli.
- Scheduler sagliginin `/api/health` ve `/admin/entegrasyonlar` ekranina eklenmesi.
- Worker tekrar calisma ve aktif lease cakismasi kontrolleri.
- 55 test dosyasi ve 236 test, lint, production build, 42 adimli authenticated smoke ile 1440/390 px browser QA basarili.
- Gercek outbox ve auth bakim endpoint cagirilari basarili; admin ekrani kalici scheduler kayitlarini gosteriyor.

Sonraki teknik paket:

1. Yedekleme scriptini ayni heartbeat/run-history modeline almak.
2. Merkezi log sink ve scheduler alarm kanallarini kurmak.
3. Uretim scheduler tanimlarini staging ortaminda dogrulamak.
4. Eski `SystemJobRun` kayitlari icin retention isi eklemek.

Migration notu: Lokal veritabaninda iki eski uygulanmis migration dosyasinin checksum'i mevcut dosyalarla uyusmuyor. Veri kaybi yaratacak reset uygulanmadi; yeni migration'lar `prisma migrate deploy` ile ileri yonlu uygulandi. Eski checksum farki staging/production oncesinde migration gecmisiyle mutabik hale getirilmelidir.

## 2026-07-16 - City Lojistik aktivasyon kapisi

- Resmi Turkiye web, takip ve transfer alanlari incelendi; kamuya acik surumlu API dokumani bulunamadi.
- Farkli ulkedeki ada benzer firmanin API dokumani entegrasyon kaynagi olarak reddedildi.
- Adapter, environment degerleri doldurulsa bile dogrulanmis sozlesme uygulanana kadar dis ag cagrisi yapmayacak sekilde kilitlendi.
- Admin entegrasyon ekranina City Lojistik hazirlik kontrolleri eklendi; credential degerleri UI veya loglara tasinmiyor.
- City sevkiyatlari handler yokken outbox sagligini bozmuyor; manuel sevk intent'i ve admin siparis baglantisi olusturuyor.
- City ekibine gonderilecek teknik bilgi talebi ve kabul kapisi operasyon dokumanina yazildi.
- Production environment preflight, liveness/readiness ayrimi ve migration deploy komutu eklendi.
- Deploy, health, scheduler ve rollback kabul sirasi production runbook'una yazildi.
- 53 test dosyasi ve 231 test, lint, TypeScript production build, authenticated smoke ve 375/1265 px browser QA basarili.
- Lokal development environment'i production preflight ve readiness tarafindan beklendigi gibi reddediliyor; liveness HTTP 200, readiness HTTP 503 donuyor.
- Bu dilim tamamlandi; siradaki ana is yedekleme heartbeat'i, merkezi log sink ve scheduler alarmlaridir.

## 2026-07-14 - SQLite backup/restore ve medya reconciliation

- Online SQLite backup, partial dosya ve final rename akisi eklendi.
- Backup `integrity_check`, `foreign_key_check`, kritik tablo sayimlari ve SHA-256 manifestiyle dogrulaniyor.
- Uygulanmis 25 migration, repository migration fingerprint'iyle eslesmeden backup final hale gelmiyor.
- Restore verification canli DB'ye dokunmadan gecici kopyada ayni kontrolleri tekrarliyor.
- Lokal medya reconciliation aktif/pasif referans, eksik, orphan ve gecersiz dosya adlarini silme yapmadan raporluyor.
- Gercek `dev.db` uzerinde 1.994.752 bayt snapshot, 25 migration, sifir FK ihlali ve restore provasi basarili.
- 44 test dosyasi, 196 test, lint, production build ve authenticated smoke basarili.

## 2026-07-14 - Roadmap reconciliation ve bayi siparis gecmisi

- Uc bagimsiz subagent roadmap, security/production ve admin-bayi UX akislarini denetledi.
- Uygulanmis auth, e-posta, tenant izolasyonu, siparis/teklif ve katalog maddeleri roadmap'te tamamlandi olarak senkronlandi.
- `/bayi/siparisler` siparis numarasi, tum operasyon durumlari ve tarih araligi filtreleri aldi.
- Liste 20 satirlik server-side sayfalama, 100 satirlik sert DAL limiti, toplam sayi ve query-preserving onceki/sonraki linkleriyle sinirlandi.
- Tasik sayfa numarasi son gecerli sayfaya clamp ediliyor; companyId kosulu filtre/count sorgularinda korunuyor.
- `/bayi/teklifler` yeni talep akisi izlenimi vermeyen salt okunur teklif arsivi metnine cevrildi.
- SQLite testleri filtre, sayfalama siniri ve firma izolasyonunu; smoke testi filtre kontrollerini dogruluyor.
- 42 test dosyasi, 188 test, lint, production build ve authenticated smoke basarili.

## 2026-07-14 - Auth maintenance ve production runbook

- Expired login failure kayitlari icin idempotent cleanup servisi eklendi.
- Ayri `MAINTENANCE_CRON_SECRET` ile korunan internal endpoint ve CLI scheduler komutu eklendi.
- Cleanup calismalari silinen kayit sayisi ve tamamlanma zamaniyla audit log'a yaziliyor.
- Login security health e-posta/IP limit gruplari ve expired backlog uzerinden hesaplaniyor.
- Public health'e authentication durumu, admin dashboard'a `Giris guvenligi` metrigi eklendi.
- Auth, SMTP, proxy, secret rotasyonu, alarm ve medya storage kabul adimlari production runbook'una yazildi.
- 40 test dosyasi, 179 test, lint, production build, gercek maintenance HTTP/audit, admin smoke ve mobile browser QA basarili.

## 2026-07-14 - Login rate limit sertlestirmesi

- Audit JSON taramali basit throttling, indeksli `AuthLoginFailure` modeline tasindi.
- E-posta ve guvenilir proxy IP esikleri bagimsiz uygulandi.
- Ham limiter anahtarlari yerine HMAC-SHA256 ve ayri production secret kullanildi.
- Forwarding header allowlist, IPv4/IPv6 dogrulamasi ve proxy trust environment sozlesmesi eklendi.
- Bilinmeyen kullanicida dummy bcrypt ve basarili giriste hesap hata temizligi eklendi.
- Kalici sozlesme `docs/architecture/auth-login-rate-limit.md` dosyasina yazildi.
- 24 migration, 37 test dosyasi, 171 test, lint, production build ve admin/dealer login smoke akisi basarili.

## 2026-07-14 - Toplu urun yayin hazirligi

- `/admin/urunler/yayin-hazirligi` operasyon ekrani eklendi.
- Taslaklar hazir, genel fiyati eksik ve stoku eksik olarak sayiliyor ve filtreleniyor.
- Hazir urunlerden 50 adede kadar secim transaction icinde yeniden dogrulaniyor.
- Stale veya eksik tek urun tum islemi durduruyor; kismi yayin olusmuyor.
- Basarili yayinlar batch kimligiyle urun bazli audit log'a yaziliyor.
- 35 test dosyasi, 157 test, lint, production build, admin smoke ve desktop/mobile browser QA basarili.

## 2026-07-13 - Urun yayini ve firma iskontosu

- Urun detayina genel fiyat + kullanilabilir stok kontrollu `Urunu yayinla` akisi eklendi.
- `HIDDEN`, `SIMPLIFIED`, `DETAILED` stok gorunurluk kodlari Turkce aciklamalara cevrildi.
- Fiyat modeli standart genel bayi baz fiyati + firma kartinda yuzdesel iskonto olarak sadelestirildi.
- Firma ozel net fiyat istisnalarinda cift iskonto engellendi.
- Firma detayina iskonto yonetimi ve audit kaydi eklendi.
- 34 test dosyasi, 153 test, production build, migration chain ve genisletilmis admin smoke akisi basarili.

## Aktif Hedef

Production deployment kabul kapisi ve merkezi gozlemlenebilirlik.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. Production SMTP/S3/scheduler credential ve merkezi alarm kanali deployment ortaminda baglanacak.
2. Bagimsiz portal hostu, DNS/TLS ve ana site `Bayi Portali` butonu entegrasyon plani kesinlestirilecek.
3. City Lojistik API dokumani, test hesabi ve idempotency sozlesmesi proje sahibinden beklenecek.

## Son Tamamlanan Tur

### 2026-07-16 - Satis ve siparis raporlamasi

- `/admin/raporlar` para birimi ve Istanbul gun siniri bazli siparis performans ekranina donusturuldu.
- Guncel net siparis, teslim, olay tarihli iptal, ortalama ve ticari inceleme KPI'lari eklendi.
- Firma performansi, durum dagilimi ve sifir gunleri koruyan donem grafigi ayni sorgu kapsamini kullaniyor.
- Fatura/tahsilat modeli olmadigi icin metrikler ciro olarak adlandirilmiyor ve para birimleri karistirilmiyor.
- Rapor sorgu indeksleri migration zincirine ve lokal veritabanina uygulandi.
- Vitest worker paralelligi Windows'ta deterministik calismasi icin dort worker ile sinirlandi.
- 47 test dosyasi, 208 test, lint, production build, authenticated admin smoke ve desktop/mobile browser QA basarili.

### 2026-07-16 - Stok operasyon raporu ve CSV

- `/admin/raporlar?view=stock` aktif urunlerde urun + depo grain'li anlik stok ekranina donusturuldu.
- Fiziksel, rezerve ve kullanilabilir miktarlar sayaclardan; stok riskleri hesaplanmis operasyon siniflarindan uretiliyor.
- Tanimli stok durumu nicel operasyon durumundan ayrildi; taslak ve durdurulmus urunler acik filtreyle erisilebilir.
- KPI, tablo, rezervasyon defteri kontrolu ve snapshot zamani tek read transaction icinden geliyor.
- CSV ayni filtre/siralama sozlesmesini kullaniyor; 5.000 satir siniri, UTF-8 BOM, RFC 4180 ve formula-injection korumasi var.
- `stock.export` yetkisi, query allowlist'i, kontrollu hata cevaplari, checksum ve audit izi eklendi.
- 50 test dosyasi, 224 test, lint, production build, authenticated smoke ve desktop/mobile browser QA basarili.

Faz disi B2B katalog ve ticaret akisi duzeltmesi tamamlandi:

- Bayi urunlerinde teklif/siparis ikilemi kaldirildi; portal yalniz dogrudan siparis uretir.
- Teklif sepeti ve yeni teklif server action'lari fail-closed kapatildi; gecmis teklif kaydi arsiv olarak korundu.
- Admin ve bayi navigasyonundan yeni teklif akisi cikarildi.
- Gonderilen UTF-8 CSV analiz edildi; 1.379 benzersiz ve tamamlanmis urun kod bazinda idempotent ice aktarildi.
- CSV fiyat/stok icermedigi icin yeni urunler taslak, fiyatsiz ve sifir stokla olusturuldu.
- Admin urun tablosundaki genisleyen satir ici editor kaldirildi; duzenleme urun detayina sabitlendi.
- Fiyat listesi ekrani genel, musteri grubu ve firma net fiyat kapsamlarini aciklar hale getirildi.
- Firma ve musteri grubu kapsamlarinin ayni listede birlesmesi DB constraint'iyle engellendi.
- CMS banner URL alani kaldirildi; permission kontrollu ve magic-byte dogrulamali dosya yukleme eklendi.
- Kalici kararlar `docs/architecture/b2b-catalog-pricing-import.md` dosyasina yazildi.
- 34 test dosyasi, 148 test, migration chain, production build ve genisletilmis admin smoke akisi basarili.

Faz 3.3 entegrasyon operasyonlari dilimi tamamlandi:

- `/admin/entegrasyonlar` kuyruk sagligi, topic/durum filtreleri, sayfalama ve guvenli olay ozetleriyle acildi.
- Admin navigasyonu role/permission bazli filtreleniyor; entegrasyon okuma ve replay yetkileri ayrildi.
- `DEAD` replay gerekceli, `RETRY` hizlandirma ise attempt ve hata kanitini koruyacak sekilde uygulandi.
- Replay komutlari UUID istek anahtari, canonical hash ve compare-and-swap ile idempotent hale getirildi.
- Ham payload, lock tokeni ve provider cevabi admin sorgularina alinmiyor.
- Gecikmis olay, suresi dolmus lease, dead-letter ve isleyicisiz topic durumlari public health sonucunu `degraded` yapiyor.
- Outbox durum/attempt/lease invariantlari SQLite `CHECK` constraint'leriyle korundu.
- 31 test dosyasi, 143 test, production build ve admin entegrasyon smoke/browser akisi dogrulandi.

Faz 3.3 transactional e-posta teslim dilimi tamamlandi:

- Provider-bagimsiz e-posta sozlesmesi ve timeout sinirli SMTP adapteri eklendi.
- Aktivasyon/parola, siparis ve teklif olaylari tipli handler registry ile teslim ediliyor.
- Credential tokenlari HMAC ile yeniden turetiliyor; plaintext token DB/outbox/log katmanlarina yazilmiyor.
- Production manuel credential link cevabi kapatildi; alicilar payload'dan degil DB'den cozuluyor.
- Outbox claim exact topic allowlist ile worker bazinda izole edildi; e-posta worker'i City shipping olaylarini claim edemiyor.
- Hassas hata/response alanlari redakte ediliyor ve lease kaybi batch'i durdurmuyor.
- Bearer secret korumali internal endpoint ve tek seferlik cron tetik scripti eklendi.
- Kalici sozlesme `docs/architecture/transactional-email-outbox.md` icinde kayda alindi.
- 28 test dosyasi, 135 test, production build, worker HTTP kontrolu ve admin smoke akisi basarili.

Production CMS medya depolama adapteri tamamlandi:

- Lokal kalici volume ve S3/R2 uyumlu object storage ayni adapter sozlesmesine alindi.
- Production ortaminda provider secimi ve gerekli ayarlar fail-closed hale getirildi.
- Private bucket icin AWS SDK v3 `PutObject`/`GetObject` akisi eklendi.
- Medya route'u aktif DB kaydi, MIME, cache ve `nosniff` kontrollerini koruyor.
- Health endpoint depolama konfigurasyonunu `ok/degraded` olarak raporluyor.
- Provider ve S3/R2 environment validation testleri eklendi.

Faz 3.3 fiyat/stok kontrollu CSV aktarim dilimi tamamlandi:

- Standart genel bayi fiyat listesi ve depo stogu icin UTF-8 CSV sozlesmesi sabitlendi.
- Dosyalar canli veriye dokunmadan 24 saatlik staging partisine aliniyor.
- Urun, fiyat, stok, depo, gorunurluk, tekrar eden kod ve rezervasyon kontrolleri satir bazinda raporlaniyor.
- Yalniz sifir hatali parti transaction icinde atomik uygulanabiliyor; stale fiyat listesi ve rezervasyonlar onay aninda yeniden kontrol ediliyor.
- Firma/grup ozel fiyatlari ve urun yayin durumu aktarimdan etkilenmiyor.
- Yetki, sahiplik, iptal ve audit izi eklendi.

Faz 3.3 stok DB invariant dilimi tamamlandi:

- Fiziksel stok ve rezerve stok sayaclari DB `CHECK` constraint'leriyle korundu.
- Rezervasyon miktari, durum kumesi ve durum-zaman damgasi iliskisi DB seviyesinde zorunlu hale geldi.
- Mevcut veri, foreign key ve indeksleri koruyan SQLite tablo rebuild migration'i uygulandi.
- Admin arayuzu ve server action artik `reservedQuantity` sayacini elle degistiremiyor.
- Dogrudan DB constraint ve forged form regresyon testleri eklendi.
- Eski rezervasyon migration'indaki zorunlu `updatedAt` tasima hatasi duzeltildi.
- Dolu legacy rezervasyonla 19 migration, 26 test dosyasi, 127 test ve production build basarili.

Faz 3.3 transactional entegrasyon outbox dilimi tamamlandi:

- Is kaydi ve versiyonlu domain olayi ayni Prisma transaction'inda commit/rollback oluyor.
- Claim tek atomik SQLite `UPDATE ... RETURNING` ifadesiyle yapiliyor.
- Lease token/expiry, exponential retry, dead-letter ve attempt log modeli eklendi.
- Siparis/teklif olusumu, donusumu ve durum gecisleri olay uretiyor.
- City sevkiyat istegi kuyruklaniyor; dogrulanmis API ve provider idempotency davranisi olmadan ag handler'i acilmiyor.
- Admin uyarisi gecmis hata loglari yerine guncel retry/dead durumlarini sayiyor.
- 24 test dosyasi, 116 test, production build, sifirdan 18 migration ve admin HTTP smoke kontrolu basarili.

Faz 3.3 tekliften siparise donusum dilimi tamamlandi:

- `APPROVED -> CONVERTED_TO_ORDER` yalniz `quote.convert` yetkili admin ve satis yoneticisi tarafindan calistirilabiliyor.
- Siparis fiyatlari katalogdan hesaplanmiyor; aktif immutable teklif revizyonundan kopyalaniyor.
- Kaynak teklif/revizyon/revizyon kalemi ve teklif surumu sipariste iliskisel audit zinciri olarak saklaniyor.
- Firma adresi ve istenen teslim tarihi snapshot'lanarak tek transaction icinde coklu depo stogu ayriliyor.
- Ayni istek replay'de ayni siparisi donduruyor; farkli payload, stale teklif, suresi gecmis revizyon ve yetersiz stok reddediliyor.
- Admin ve bayi teklif/siparis detaylari arasinda iki yonlu izlenebilir baglantilar eklendi.
- 23 test dosyasi, 108 test, lint, production build ve sifirdan 16 migration kurulumu basarili.

Onceki teklif sepeti guvenlik kapanisinda:

- Teklif sepetine version/CAS, atomik tuketim ve singleton checkout lock eklendi.
- Idempotency anahtari firma kapsamli hale getirildi; canonical payload SHA-256 hash'i farkli isteklerin replay edilmesini engelliyor.
- Teklif kaydinda kaynak sepet ID/surumu saklanarak audit izi guclendirildi.
- Eski sepet surumu, farkli payload replay'i ve firmalar arasi ayni UUID senaryolari entegrasyon testleriyle dogrulandi.
- Faz 3.5, mevcut kurumsal siteyi koruyan bagimsiz subdomain portal mimarisine gore duzeltildi.
- 22 test dosyasi, 105 test, lint ve production build basarili.

Onceki admin teklif operasyonlari diliminde:

- `/admin/teklifler` teklif kuyrugu; arama, durum filtresi, KPI ve sayfalama ile acildi.
- `/admin/teklifler/[id]` kalem, firma, bayi notu, fiyatlandirma, durum ve history operasyonlarini birlestirdi.
- Teklif gecisleri kati state machine ile sinirlandi; review, price, send, approve ve cancel yetkileri ayrildi.
- Teklife `version`, aktorlu status history ve hash kontrollu idempotent command ledger eklendi.
- Fiyatlar decimal string olarak dogrulaniyor; satir ve ara toplamlar transaction icinde server tarafinda hesaplanıyor.
- Admin fiyatlandirmasi katalog snapshot'ini ezmiyor; her kayit immutable `QuoteOfferRevision` olusturuyor.
- Aktif revizyon admin ve bayi detayinda gosteriliyor; `internalNotes` bayi sorgusuna dahil edilmiyor.
- Dogrudan `PRICED` bypass'i engellendi; aktif revizyon olmadan `OFFER_SENT` gecisi reddediliyor.
- `pricedAt` talep aninda degil, ilk gercek admin fiyatlandirmasinda set ediliyor.
- Admin shell ve dashboard teklif kuyruguna baglandi.
- 22 test dosyasi, 102 test, production build, HTTP smoke ve 390x844 responsive browser QA basarili.

Agent incelemesinden takip borclari:

- Teklif gonderim idempotency anahtari payload hash ile korunmali.
- `QuoteCart` version ve checkout CAS ile eszamanli sekmelerden korunmali.
- Teklif revizyonuna gecerlilik tarihi/indirim/vergi gereksinimi is karariyla eklenmeli.

Faz 3.3 siparis durum ve stok yasam dongusu dilimi tamamlandi:

- Siparis gecisleri kati bir state machine ile sinirlandi; terminal durumlar geri acilamiyor.
- Sales review/approve/hold/cancel ve warehouse fulfill/ship/deliver yetkileri ayrildi.
- Siparise `version` ve `heldFromStatus`, komutlara UUID idempotency + request hash eklendi.
- Compare-and-swap order version kontrolu stale ekran ve paralel gonderimi engelliyor.
- Ayni komut replay'de basarili sonucu donduruyor; farkli payload conflict oluyor.
- Iptal stock-item bazinda rezervasyonu release ediyor; stok miktarini dusurmuyor.
- Sevk stock-item bazinda rezervasyonu consume edip fiziksel stogu dusuruyor; teslim ikinci kez stok dusurmuyor.
- Kargolu sevkte tasiyici ve takip numarasi zorunlu; musteri teslim alma akisi ayri ele aliniyor.
- Admin detayinda role gore fiyat/rezervasyon gorunurlugu ve aktorlu durum history eklendi.
- Entegrasyon, action, domain ve rol testleri ile admin detay smoke kontrolu eklendi.
- 20 test dosyasi, 95 test, lint, production build, migration status ve stok ledger invariant kontrolu basarili.

Faz 3.3 siparis checkout dilimi tamamlandi:

- `/urunler/[id]` fulfillment mode'a gore siparis ve teklif aksiyonlari gosteriyor.
- `OrderCart` ve `OrderCartItem` ile bayi kullanicisi/firma kapsamli kalici sepet eklendi.
- `/sepet` teslimat adresi, yeni adres, sevkiyat tercihi, not ve server kaynakli toplamla calisiyor.
- Checkout firma/kullanici aktifligini, cart version'i, urun modunu, fiyat kademesini ve stogu transaction icinde yeniden dogruluyor.
- Company-scoped idempotency + request hash tekrar gonderimde ayni siparisi donduruyor; farkli payload reddediliyor.
- Stok birden fazla depo satirindan deterministik olarak ayriliyor ve optimistic update ile yarisi engelleniyor.
- Urun, fiyat, adres ve teslimat snapshot'lari siparise yaziliyor; sepet basarili gonderimde siliniyor.
- `/bayi/siparisler/[id]` bayi takip ekrani ve `/admin/siparisler` liste/detay operasyon gorunumu eklendi.
- 17 test dosyasi, 79 test, lint ve production build basarili.

Faz disi auth/ticaret akisi duzeltmesi tamamlandi:

- Admin ve bayi kimlikleri public header'da ayrildi; admin bayi fiyatlarini veya bayi CTA'larini goremez.
- Bayi girisi guvenli `next` degeri ne olursa olsun `/` ana sayfasina doner.
- `/urunler` ortak ticaret alani, `/bayi` takip merkezi olarak sabitlendi.
- Teklif sepeti `/teklif-sepeti` rotasina tasindi; eski bayi rotalari kalici yonleniyor.
- Admin firma detayina coklu bayi kullanicisi ekleme, askilama, etkinlestirme ve soft devre disi birakma eklendi.
- Aktivasyon ve parola sifirlama ayri token modelleriyle ayrildi; ham token veritabaninda saklanmiyor.
- Kullanici askilandiginda ve parola yenilendiginde aktif oturumlar iptal ediliyor.
- Auth/ticaret regresyon testleri eklendi; production build basarili.

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
- B2B host `portal.ekolglass.com` mu `b2b.ekolglass.com` mu olacak?
- B2B admini portal altinda `/admin` mi, ayri bir admin subdomaininde mi yayinlanacak?

Varsayilan karar:

- Admin urun detayinda sekmeli yapi kullanilacak.
- Public katalogda kategori, marka, model, cam tipi ve stok durumu filtreleri olacak.
- Bayiye stok ilk etapta sade durum olarak gosterilecek.
- Fiyatlar guest/PENDING icin kapali; bayi rollerinde firma veya musteri grubu eslesmesiyle, ic ekip rollerinde fiyat okuma yetkisiyle acik olacak.
- Faz 3.2'de ilk uygulama, onaylanan basvurudan tek `Company` ve bir `DEALER_OWNER` kullanicisi uretme varsayimiyla ilerleyecek.
- Ilk bayi kullanicisi gecici parola ile `ACTIVE` yapilmayacak; `INVITED` olusacak ve sifresini tek kullanimlik aktivasyon akisinda kendi belirleyecek.
- Kurumsal `www`, mevcut CMS ve adminiyle korunacak; B2B bagimsiz subdomain'de yayinlanacak.
- Ana site split-screen veya root gateway olmayacak; yalniz `Bayi Portali` butonu eklenecek.
- B2B `/admin`, yalniz bu uygulamanin operasyon panelidir ve kurumsal site adminiyle ortak oturum kullanmaz.
