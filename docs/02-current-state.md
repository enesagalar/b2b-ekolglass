# Guncel Proje Durumu

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
- Yerel kabul: 19/19 Node, 385/385 Vitest, 47 authenticated HTTP smoke, lint, typecheck, production build, release yasam dongusu demosu ve 0 production dependency vulnerability.
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
- Gecmis teklif kayitlari salt okunur audit arsivi olarak korunuyor.
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
   - Tekil fiyat, CMS ve medya yazimlarinin audit atomikligi; firma ticari kosullarinin stale-form korumasi kalan P1 kapanis isidir.

3. Teklif/siparis akisinda kalanlar:
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

- Kalan yogun ikincil admin/bayi ekranlari Faz 7 tasarim sistemiyle kademeli sadelestirilecek.
- Degismez deployment artifact'i ve rollback manifesti secilen platformda uygulanacak.
- Production credential, DNS/TLS, SMTP, scheduler ve merkezi log sink dis kabul listesi.
- Gercek ortamda backup restore ve S3/R2 medya upload/read/reconciliation provasi.

City Lojistik canli adapteri, resmi API sozlesmesi gelene kadar kapsam disinda ve fail-closed kalir.
