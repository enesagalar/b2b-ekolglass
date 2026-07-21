# Production Release Evidence Record

> Bu belge her production release icin kopyalanip operator tarafindan doldurulur. Isaretlenmemis zorunlu bir madde veya kanitsiz bir sonuc **NO-GO** kabul edilir.
>
> **Secret-safe kural:** Credential, parola, token, cookie, private key, HMAC degeri, SMTP sifresi, connection string veya tam environment dump'i bu kayda yapistirilmaz. Yalniz secret-store kayit adi/surum kimligi, maskelenmis provider referansi, correlation ID, job/run ID ve erisim kontrollu kanit baglantisi yazilir.

## 1. Release Kimligi

| Alan | Deger / kanit |
|---|---|
| Release adi / change ID | `________________` |
| Repository | `________________` |
| Branch | `________________` |
| Commit SHA (tam) | `________________` |
| Tag | `________________` |
| Build / artifact ID | `________________` |
| Artifact digest (SHA-256 / image digest) | `________________` |
| Runtime `/api/health/live` release SHA / digest / ID | `________________` |
| CI run URL / ID | `________________` |
| Deployment platform release URL / ID | `________________` |
| Hedef ortam ve bolge | `production / ________________` |
| Planlanan pencere (UTC) | `________________` |
| Operator | `________________` |

- [ ] Deploy edilen artifact yukaridaki commit'ten uretilmis ve digest eslesmesi dogrulanmistir.
- [ ] Calisma agaci temiz commit uzerindedir; `npm ci` ve `npm run check` basarilidir.
- Kanit URL/ID: `________________`

## 2. Environment Ve Preflight

Komut: `npm run preflight:production`

| Kontrol | Sonuc | Kanit URL/ID / maskelenmis referans |
|---|---|---|
| Production'a ozel veritabani yapilandirmasi | [ ] Gecti [ ] Kaldi | `________________` |
| HTTPS origin degerleri | [ ] Gecti [ ] Kaldi | `________________` |
| Auth secret ayrimi ve minimum uzunluklar | [ ] Gecti [ ] Kaldi | `________________` |
| SMTP/TLS ve dogrulanmis gonderici | [ ] Gecti [ ] Kaldi | `________________` |
| LOCAL/S3 medya provider yapilandirmasi | [ ] Gecti [ ] Kaldi | `________________` |
| Sifreli offsite backup provider | [ ] Gecti [ ] Kaldi | `________________` |
| Alarm webhook allowlist/HMAC yapilandirmasi | [ ] Gecti [ ] Kaldi | `________________` |
| Scheduler lease/warning/critical sirasi | [ ] Gecti [ ] Kaldi | `________________` |
| `CITY_LOJISTIK_ENABLED=false` | [ ] Dogrulandi [ ] Uygulanamaz | `________________` |

- Preflight run ID / correlation ID: `________________`
- Secret-store referanslari ve surumleri (deger yazmayin): `________________`
- [ ] Preflight ciktisinda secret veya mutlak veritabani yolu bulunmadigi kontrol edildi.
- [ ] Preflight'in yalniz konfigurasyonu dogruladigi; SMTP teslimi, S3 yazma/okuma ve provider policy kabulunun ilgili bolumlerde ayrica kanitlandigi kabul edildi.

## 3. Migration

| Adim | Komut | Sonuc | Kanit URL/ID |
|---|---|---|---|
| Repository / DB migration butunlugu | `npm run prisma:migrate:verify` | [ ] Gecti [ ] Kaldi | `________________` |
| Production migration uygulamasi | `npm run prisma:migrate:deploy` | [ ] Gecti [ ] Kaldi | `________________` |
| Deploy sonrasi butunluk kontrolu | `npm run prisma:migrate:verify` | [ ] Gecti [ ] Kaldi | `________________` |

- Uygulanan migration adlari: `________________`
- Migration baslangic / bitis zamani (UTC): `________________ / ________________`
- [ ] Eksik, repository disi, yarim, rollback edilmis veya checksum uyusmaz migration yoktur.
- [ ] Migration basarisizsa yeni uygulama surumu trafige acilmamistir.

## 4. Veritabani Backup Ve Izole Restore

| Adim | Komut / kontrol | Sonuc | Kanit URL/ID |
|---|---|---|---|
| Izlenen production backup | `npm run db:backup:run` | [ ] Gecti [ ] Kaldi | `________________` |
| Manifest boyut ve SHA-256 dogrulamasi | Backup run sonucu | [ ] Gecti [ ] Kaldi | `________________` |
| SQLite integrity / foreign key kontrolu | Backup run sonucu | [ ] Gecti [ ] Kaldi | `________________` |
| Izole restore provasi | `npm run db:restore:verify -- "<guvenli-backup-dosyasi>"` | [ ] Gecti [ ] Kaldi | `________________` |
| Sifreli offsite aktarim | Provider object/version ID | [ ] Gecti [ ] Kaldi | `________________` |
| Farkli failure domain'de recovery erisimi | Recovery test ID | [ ] Gecti [ ] Kaldi | `________________` |

- Backup correlation/job ID: `________________`
- Manifest dosya adi ve SHA-256 (host yolu yazmayin): `________________`
- Offsite object/version referansi (signed URL veya credential yazmayin): `________________`
- Restore test ortami ve zamani (UTC): `________________`
- Restore edilen kritik tablo sayimlari kaniti: `________________`
- [ ] Restore provasi canli veritabanina yazmadan tamamlanmistir.
- [ ] Backup bucket public degildir ve server-side encryption aktiftir.

## 5. S3/R2 Medya

| Adim | Komut / kontrol | Sonuc | Kanit URL/ID |
|---|---|---|---|
| Readiness gercek bucket erisimi | `GET /api/health/ready` | [ ] Gecti [ ] Kaldi | `________________` |
| Admin test gorseli yukleme | CMS medya akisi | [ ] Gecti [ ] Kaldi | `________________` |
| `/media/[file]` okuma | HTTP response kaydi | [ ] Gecti [ ] Kaldi | `________________` |
| Restart sonrasi ayni nesneyi okuma | HTTP response kaydi | [ ] Gecti [ ] Kaldi | `________________` |
| Aktif provider reconciliation | `npm run media:reconcile` | [ ] Gecti [ ] Kaldi | `________________` |

- Provider / bolge (credential yazmayin): `________________`
- Test object ID veya maskelenmis key: `________________`
- HTTP status / `Content-Type` / `Cache-Control` / `X-Content-Type-Options`: `________________`
- Reconciliation rapor ID ve sayimlari (`missingActive`, `orphan`, `invalid`): `________________`
- [ ] Aktif kayip nesne sayisi sifirdir.
- [ ] Beklenmeyen orphan/gecersiz nesneler icin sahip ve takip kaydi atanmistir.
- [ ] Reconciliation salt okunur calismis, nesne silmemistir.

## 6. SMTP Ve Transactional Outbox

| Adim | Komut / kontrol | Sonuc | Kanit URL/ID |
|---|---|---|---|
| SMTP TLS ve dogrulanmis sender | Provider panel kaydi | [ ] Gecti [ ] Kaldi | `________________` |
| Aktivasyon e-postasi gercek teslim | Test message ID | [ ] Gecti [ ] Kaldi | `________________` |
| Outbox worker calismasi | `npm run outbox:run` | [ ] Gecti [ ] Kaldi | `________________` |
| Yetkisiz internal outbox istegi | HTTP 401 kaniti | [ ] Gecti [ ] Kaldi | `________________` |
| Kuyruk sagligi | `GET /api/health` | [ ] Gecti [ ] Kaldi | `________________` |

- Scheduler run/correlation ID: `________________`
- SMTP provider message ID (icerik/token yazmayin): `________________`
- PENDING / RETRY / DEAD / expired lease sayimlari: `________________`
- [ ] Raw aktivasyon/parola tokeni DB, outbox, audit veya log kanitinda bulunmuyor.
- [ ] Due ancak handler'i olmayan topic ve kabul edilmemis DEAD kaydi yoktur.

## 7. Scheduler, Heartbeat Ve Dead-Man

| Is | Beklenen siklik | Calistirma komutu | Son run ID / zaman | Sonuc |
|---|---|---|---|---|
| E-posta outbox | En az dakikada bir | `npm run outbox:run` | `________________` | [ ] Gecti [ ] Kaldi |
| Auth rate-limit bakimi | En az saatte bir | `npm run auth-rate-limit:maintain` | `________________` | [ ] Gecti [ ] Kaldi |
| Veritabani backup | Gunde bir | `npm run db:backup:run` | `________________` | [ ] Gecti [ ] Kaldi |
| Run-history retention | Gunde bir | `npm run system-jobs:maintain` | `________________` | [ ] Gecti [ ] Kaldi |
| Sistem alarm dagitimi | En az dakikada bir | `npm run system-alerts:run` | `________________` | [ ] Gecti [ ] Kaldi |

- Scheduler platform URL/ID: `________________`
- Heartbeat/lease esik konfigurasyonu kaniti: `________________`
- `/admin/entegrasyonlar` durum kaniti: `________________`
- Dead-man monitor URL/ID: `________________`
- Dead-man sentetik hata olayi ve bildirim ID'si: `________________`
- [ ] Ayni cron paralel baslatilmiyor; tek instance veya dagitik lock kanitlandi.
- [ ] `SYSTEM_ALERT_DISPATCH` non-zero/heartbeat kaybi bagimsiz dead-man kanaliyla alarm uretti.
- [ ] Gecikmis, lease'i dolmus veya basarisiz kritik scheduler isi yoktur.

## 8. Alert HMAC Receiver

| Senaryo | Beklenen | Sonuc | Kanit URL/ID |
|---|---|---|---|
| Gecerli imza ve timestamp | Kabul | [ ] Gecti [ ] Kaldi | `________________` |
| Bozuk imza | Red | [ ] Gecti [ ] Kaldi | `________________` |
| Eski timestamp | Red | [ ] Gecti [ ] Kaldi | `________________` |
| Ayni `x-idempotency-key` replay | Tek etkili islem | [ ] Gecti [ ] Kaldi | `________________` |
| OPENED / ESCALATED / REMINDER / RECOVERED | Her yasam dongusu teslim edildi | [ ] Gecti [ ] Kaldi | `________________` |
| Redirect yaniti | Takip edilmedi | [ ] Gecti [ ] Kaldi | `________________` |
| Timeout / retry sinifi | Kontrollu retry | [ ] Gecti [ ] Kaldi | `________________` |

- Receiver deployment/version ID: `________________`
- `npm run system-alerts:run` correlation ID: `________________`
- Ornek outbox event/idempotency ID'leri: `________________`
- [ ] Kanitlarda HMAC secret, header degeri, webhook query veya provider response body yoktur.

## 9. Health Kapilari

Public salt-okunur otomasyon: `npm run evidence:collect` veya GitHub Actions `Production Public Evidence`. Kullanim ve guvenlik siniri: `docs/operations/production-public-evidence.md`.

| Endpoint | Beklenen | Gercek | Correlation ID / kanit URL |
|---|---|---|---|
| `GET /api/health/live` | HTTP 200 | `________________` | `________________` |
| `GET /api/health/ready` | HTTP 200, `status=ready`; environment/database/mediaStorage `ok` | `________________` | `________________` |
| `GET /api/health` | HTTP 200; operasyon sinyallerinde `error` yok | `________________` | `________________` |

- [ ] Readiness 503 iken release trafige acilmadi.
- [ ] Health yanitlari secret, DB yolu, bucket/endpoint veya ham exception sizdirmiyor.
- [ ] Scheduler gecikmesinin readiness yerine operasyon alarmi olarak ele alindigi dogrulandi.
- [ ] Runtime release SHA, artifact digest ve release ID beklenen deployment degerleriyle birebir eslesti.
- [ ] DNS onayli provider hedefine eslesti, TLS suresi en az 30 gun ve HTTP ayni host HTTPS'e yonlendi.

## 10. Auth Ve Tenant Smoke

Izole CI/staging smoke komutu: `npm run smoke:admin`

> **Production'da calistirmayin.** Bu script sentetik kullanici, siparis, teklif ve basvuru kayitlari olusturur. Yalniz her kosuda sifirlanan izole CI/staging veritabanina karsi kullanilir. Production kabulunde bu tablodaki davranislar CI entegrasyon testleri ve onayli, salt-okunur/manual production kontrolleriyle ayri ayri kanitlanir.

| Senaryo | Sonuc | Kullanici/tenant referansi | Kanit URL/ID |
|---|---|---|---|
| Admin login ve admin route yetkisi | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Bayi login sonrasi ana sayfa/session gorunumu | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Bayi dashboard ve siparis gorunurlugu | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Bayinin baska tenant verisine erisememesi | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Bayi session'inin admin route'undan reddi | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Admin/bayi hesap gecisinde eski session iptali | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Logout sonrasi session/cookie iptali | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Aktivasyon ve parola sifirlama tek kullanim/sure | [ ] Gecti [ ] Kaldi | `________________` | `________________` |
| Proxy spoof ve login rate-limit | [ ] Gecti [ ] Kaldi | `________________` | `________________` |

- [ ] Test hesaplari production musteri verisi degildir veya onayli sentetik kayitlardir.
- [ ] Ekran goruntusu/log kanitlarinda e-posta, telefon, cookie veya token maskelenmistir.

## 11. DNS, TLS, Robots Ve Sitemap

| Kontrol | Sonuc | Kanit URL/ID |
|---|---|---|
| Portal hostname kesinlestirildi | [ ] Gecti [ ] Kaldi | `________________` |
| DNS A/AAAA/CNAME beklenen hedefe cozuluyor | [ ] Gecti [ ] Kaldi | `________________` |
| TLS sertifika zinciri ve hostname dogru | [ ] Gecti [ ] Kaldi | `________________` |
| Sertifika bitis monitoru aktif | [ ] Gecti [ ] Kaldi | `________________` |
| HTTP -> HTTPS yonlendirmesi | [ ] Gecti [ ] Kaldi | `________________` |
| `NEXT_PUBLIC_SITE_URL` canonical host ile eslesiyor | [ ] Gecti [ ] Kaldi | `________________` |
| `/robots.txt` ozel admin/bayi alanlarini disliyor | [ ] Gecti [ ] Kaldi | `________________` |
| `/sitemap.xml` yalniz onayli public rotalari listeliyor | [ ] Gecti [ ] Kaldi | `________________` |
| Ana site `Bayi Portali` baglantisi dogru origin'e gidiyor | [ ] Gecti [ ] Kaldi | `________________` |

- DNS degisiklik/ticket ID: `________________`
- TLS sertifika fingerprint/serial veya provider ID: `________________`
- Robots/sitemap HTTP kanit URL'leri: `________________`
- [ ] Admin login URL'si public sitemap veya ana navigasyonda yayinlanmamistir.

## 12. Rollback Hazirligi

| Alan | Deger / kanit |
|---|---|
| Onceki saglikli release ID / commit | `________________` |
| Onceki artifact digest | `________________` |
| Trafik geri alma komutu/prosedur URL'si | `________________` |
| Rollback sorumlusu | `________________` |
| Rollback karar suresi / esigi | `________________` |
| Dogrulanmis backup manifest ID | `________________` |
| Restore runbook | `docs/operations/sqlite-backup-restore-runbook.md` |
| Son rollback tatbikati URL/ID | `________________` |

- [ ] Onceki artifact deploy platformunda erisilebilir ve digest'i dogrulanmistir.
- [ ] Migrationlarin geriye uyumlulugu yazili olarak degerlendirilmistir.
- [ ] DB geri alma gerekiyorsa yalniz dogrulanmis backup ve yazili restore proseduru kullanilacaktir.
- [ ] Rollback halinde release commit'i, neden ve correlation ID'ler audit/deployment kaydina yazilacaktir.

## 13. Go / No-Go Karari

### Acik Riskler Ve Istisnalar

| Risk / istisna | Etki | Sahip | Son tarih | Kabul/ticket URL/ID |
|---|---|---|---|---|
| `________________` | `________________` | `________________` | `________________` | `________________` |

### Zorunlu Son Kontrol

- [ ] Tum zorunlu bolumler tamamlandi ve her sonuc icin erisim kontrollu kanit URL/ID'si var.
- [ ] Kritik veya yuksek acik risk yoktur.
- [ ] Migration, backup/restore, media, SMTP/outbox, scheduler/dead-man, alert receiver, health, auth/tenant ve DNS/TLS kontrolleri gecmistir.
- [ ] Rollback yolu ve sorumlusu onaylanmistir.
- [ ] City Lojistik kabul kapsam disiysa otomasyon kapali tutulmustur.

**Karar:** [ ] GO  [ ] NO-GO  [ ] ROLLBACK

**Karar zamani (UTC):** `________________`

**Karar ozeti / change ticket:** `________________`

## 14. Onaylayanlar

| Rol | Ad soyad | Karar | Zaman (UTC) | Onay/ticket URL/ID |
|---|---|---|---|---|
| Release operatoru | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |
| Uygulama sahibi | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |
| Veritabani / backup sahibi | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |
| Guvenlik sahibi | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |
| Operasyon / altyapi sahibi | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |
| Is birimi sahibi | `________________` | [ ] Onay [ ] Red | `________________` | `________________` |

> Isim yazmak tek basina onay kaniti degildir. Her onay icin degistirilemez veya audit edilebilir bir deployment approval, change ticket, imzali kayit ya da sistem olay ID'si eklenmelidir.
