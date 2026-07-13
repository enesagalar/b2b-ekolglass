# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 3.3 - Admin Teklif Operasyonlari, Entegrasyon Outbox'i ve Davet Teslimi.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. Transactional e-posta adapter interface'i ve saglayici karari eklenecek.
2. Outbox dead-letter/retry gorunumu icin permission kontrollu admin entegrasyon ekrani kurulacak.
3. Login rate-limit e-posta + IP anahtarli indeksli modele tasinacak.
4. Admin shell navigasyonu tum ic roller icin permission-aware hale getirilecek.
5. Bagimsiz portal hostu, DNS/TLS ve ana site `Bayi Portali` butonu entegrasyon plani kesinlestirilecek.

## Son Tamamlanan Tur

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
