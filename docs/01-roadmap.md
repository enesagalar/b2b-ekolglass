# Faz Yol Haritasi

## Faz 1 - Temel Platform

Durum: Tamamlandi.

Kapsam:

- Next.js App Router, TypeScript, Tailwind temeli.
- Prisma/SQLite gelistirme veritabani.
- Rol, izin ve durum sabitleri.
- Bayi basvuru formu.
- Katalog onizleme ekrani.
- Admin dashboard ve banner icerik yonetimi ekrani.
- Ilk seed verisi ve domain testleri.

Cikis kriteri:

- `npm run lint`, `npm run test`, `npm run build` basarili.
- Prisma client uretilebilir.
- Ilk migration ve seed akisi calisir.

## Faz 2 - Gercek Auth ve Admin Korumasi

Durum: Tamamlandi.

Kapsam:

- Guvenli oturum sistemi.
- Sifre hashleme, password reset hazirligi.
- Admin route guard.
- Firma bazli veri erisim kisitlari.
- Audit log yazimi.

Tamamlanan ek kapsam:

- Aktivasyon ve parola sifirlama icin ayri, hash saklamali tek kullanimlik token akislar.
- Parola yenileme ve kullanici askisinda aktif oturum iptali.
- Login rate limit, proxy guveni, HMAC anahtarlama ve periyodik cleanup.
- Auth/session, aktivasyon, parola sifirlama ve rate-limit entegrasyon testleri.

## Faz 2.5 - Admin UX Shell ve Operasyon Merkezi

Durum: Tamamlandi.

Kapsam:

- Kalici sol admin menusu.
- Ust bar: aktif kullanici, hizli arama, bildirim/uyari alani.
- Dashboard operasyon merkezi.
- Modul kartlari yerine gercek is akis panelleri.
- Bekleyen bayi, dusuk stok, acik teklif, yeni siparis, sevkiyat ve audit akislarini tek ekranda gostermek.
- Admin route yapisini tek layout altinda toparlamak.

Cikis kriteri:

- `/admin` profesyonel operasyon paneli gibi hissedilir.
- Tum admin ekranlari ayni shell, sidebar ve sayfa basligi duzenini kullanir.
- Dashboard verisi DB'den gelir ve bos durumlari duzgun tasarlanir.
- Mobil/tablet/desktop kirilimlari bozulmaz.

Tamamlananlar:

- Ortak admin shell.
- Sol sidebar.
- Mobil menu.
- Ust bar ve kullanici/rol alani.
- Dashboard operasyon merkezi.
- `/admin/urunler` ve `/admin/icerik` shell icine alindi.

## Faz 3 - Urun ve Katalog Operasyonu

Durum: Tamamlandi; production operasyon sertlestirmesi devam ediyor.

Kapsam:

- Urun CRUD.
- Kategori yonetimi.
- Teknik dosya/gorsel modeli.
- Arama, filtre ve sayfalama.
- Stok gorunurluk kurallari.

Tamamlananlar:

- Urun, kategori, fiyat listesi, fiyat ve stok icin admin CRUD/upsert temeli.
- Validation ve helper testleri.
- Audit log yazimi.
- Urun liste arama/filtre/sayfalama.
- Urun detay sayfasi ve sekmeli UX.
- Medya/teknik dosya yonetimi.
- Bayi rolune gore fiyat gorunurlugu.
- Public katalog arama ve filtreleme.
- Kategori ve fiyat listesi alt ekranlari.
- Medya soft aktif/pasif karar modeli.
- Uyumluluk/OEM duplicate/delete karar modeli.
- Bayi basvurusu admin liste/detay ve inceleme akisi.
- Onaydan transaction tabanli firma ve davet bekleyen bayi sahibi uretimi.
- Musteri grubu, odeme kosulu, kredi limiti ve audit kaydi.
- Permission, optimistic concurrency ve cakisma kontrolleri.
- Tek kullanimlik bayi aktivasyonu ve ilk parola belirleme.
- Admin firma liste/detay ve kullanici davet yonetimi.
- DB seviyesinde firma/grup fiyat izolasyonu.
- Merkezi ACTIVE dealer + APPROVED company context DAL.
- Bayi operasyon dashboard, siparis, teklif ve firma hesap ekranlari.
- DB seviyesinde order/quote tenant izolasyonu ve SQLite testi.
- Dealer portal operasyon sorgu indeksleri.

Tamamlanan ek kapsam:

- Transactional SMTP/outbox teslim adapteri ve guvenli credential linkleri.
- Birlesik public/bayi katalogu ve firma kapsamli fiyat cozumu.
- Siparis/teklif sepeti, detay ve mutasyonlarda company tenant izolasyonu.
- Kontrollu fiyat/stok CSV staging, hata raporu ve atomik onay.
- Fiyat/stok kontrollu toplu urun yayin kapisi.
- Lokal ve S3/R2 uyumlu CMS medya depolama adapteri.

Tamamlanan ticari kontrol ek kapsami:

- Firma kredi politikasi, odeme kosulu ve kredi limiti yonetimi.
- Siparis aninda ticari kosul ve acik siparis exposure snapshot'i.
- Onay aninda yeniden hesaplanan kredi limiti kapisi.
- Ayrik `order.credit.override` yetkisi ve zorunlu ic gerekce.
- Bayi ekranlarindan ic operasyon/ticari not izolasyonu.

## Faz 3.3 - Dealer Context ve Bayi Operasyon Portali

Durum: Ana siparis ve takip akislari tamamlandi; liste ergonomisi devam ediyor.

Tamamlananlar:

- `/bayi` responsive operasyon shell ve dashboard.
- `/bayi/siparisler`, `/bayi/teklifler`, `/bayi/hesabim`.
- Session kaynakli merkezi company context.
- Company-scoped order, quote ve shipment sorgulari.
- Cross-company entegrasyon testi ve HTTP smoke kapsami.
- Mobil kompakt operasyon listeleri.

Referans:

- `docs/phases/phase-03-3-dealer-context-dashboard.md`

## Faz 3.5 - Bagimsiz B2B Portali ve Kurumsal Site Gecis Baglantisi

Durum: Sistem siniri kesinlesti; host ve production dagitim ayrintilari bekliyor.

Kapsam:

- Mevcut `www.ekolglass.com`, hostingi, CMS'si ve adminiyle korunacak.
- Kurumsal sitenin masaustu ve mobil navigasyonuna `Bayi Portali` butonu eklenecek.
- B2B uygulamasi `portal.ekolglass.com` veya kesinlesecek diger subdomain'de bagimsiz yayinlanacak.
- B2B admini, veritabani, CMS ayarlari ve entegrasyonlari kurumsal sistemden izole kalacak.
- DNS, TLS, environment, backup, rollback, robots/noindex ve cross-domain gecisleri dogrulanacak.
- Split-screen, root gateway, ortak CMS ve kurumsal siteyi yeniden kurma bu fazin kapsami disindadir.

Mimari referans:

- `docs/architecture/unified-web-b2b-cms.md`

## Faz 4 - Teklif ve Siparis Akisi

Durum: Tamamlandi; yeni B2B teklif talebi urun karariyla kapatildi, eski teklifler salt okunur arsivdir.

Kapsam:

- Teklif sepeti.
- Ozel olcu ve dosya upload.
- Teklif durum yonetimi.
- Tekliften siparise donusum.
- Siparis durum gecmisi.

Tamamlananlar:

- Firma kapsamli siparis sepeti, checkout, fiyat/stok yeniden dogrulamasi ve rezervasyon.
- Idempotent siparis/teklif komutlari, strict state machine ve actor history.
- Teklif fiyatlandirma revizyonlari ve tekliften siparise izlenebilir donusum.
- Iptal/release, sevk/consume ve teslim stok yasam dongusu.
- Admin siparis/teklif kuyruklari ve bayi detay/takip ekranlari.

## Faz 5 - Fiyat, Raporlama ve Entegrasyon Hazirligi

Durum: Devam ediyor.

Kapsam:

- Musteri grubu ve firma bazli fiyat listeleri.
- Satis raporlari.
- Bildirim altyapisi.
- ERP/MES entegrasyon servis sinirlari.

Siradaki sira:

1. Yedekleme heartbeat'i, merkezi log sink ve scheduler alarmlari.
2. City Lojistik canli adapteri; API dokumani ve test hesabi geldiginde.

Tamamlanan gozlemlenebilirlik dilimi:

- Hassas veri maskeleyen yapilandirilmis JSON logger ve sunucu kaynakli request correlation.
- Next.js instrumentation uzerinden yakalanmayan istek hatasi kaydi.
- Outbox ve auth bakimi icin atomik lease, kalici run history ve heartbeat saglik modeli.
- Operasyonel health ve admin entegrasyon ekraninda scheduler gorunurlugu.

Tamamlanan production deployment kabul dilimi:

- Secret degerlerini sizdirmayan merkezi production environment preflight.
- Development DB, localhost/HTTP origin, zayif secret, SMTP, medya ve City aktivasyon kontrolleri.
- Bagimlilik sorgulamayan `/api/health/live` ve 503 semantikli `/api/health/ready` ayrimi.
- Production migration komutu ve deploy/rollback/scheduler kabul runbook'u.

Tamamlanan raporlama dilimi:

- Para birimi bazinda siparis talebi, teslim, iptal, ortalama ve ticari inceleme KPI'lari.
- Istanbul saat dilimine sabitlenmis 7/30/90 gun ve ozel tarih filtreleri.
- Siparis snapshot tutarlariyla firma performansi, durum dagilimi ve kesintisiz zaman serisi.
- Rapor sorgulari icin Order, Shipment ve OrderStatusHistory indeksleri.
- Ekranin fatura, tahsilat veya muhasebe cirosu olmadigini aciklayan metrik sozlesmesi.
- Aktif urunlerde urun + depo grain'li anlik stok operasyon raporu.
- Fiziksel, rezerve ve kullanilabilir sayaçlardan turetilen stok risk siniflari.
- Aktif rezervasyon defteri ile rezerve sayac uyumsuzluk kontrolu.
- `stock.export` izinli, UTF-8 BOM ve formula-injection korumali CSV disari aktarimi.

Tamamlanan City Lojistik hazirlik dilimi:

- Canli API sozlesmesi olmadan ag cagrisi yapmayan fail-closed adapter kapisi.
- Sozlesme surumu, HTTPS endpoint, credential ve musteri hesabi icin ayri aktivasyon kontrolleri.
- Admin entegrasyon ekraninda secret sizdirmayan saglayici hazirlik gorunumu.
- City ekibinden istenecek API, webhook, idempotency ve kabul testi teknik paketi.
