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

Kalan operasyon borcu:

- SQLite backup/restore tatbikati ve medya reconciliation.
- Kredi limiti/exposure tabanli ticari onay kapisi.

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

1. SQLite backup/restore ve medya reconciliation.
2. Kredi limiti/exposure tabanli ticari onay.
3. City Lojistik canli adapteri; API dokumani ve test hesabi geldiginde.
