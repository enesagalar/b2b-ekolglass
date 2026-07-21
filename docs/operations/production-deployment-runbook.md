# Production Deployment Kabul Runbook

## Amac

Bu runbook bir release'in migration, runtime konfigurasyonu, health kapilari ve arka plan isleriyle birlikte kontrollu acilmasini tanimlar. `npm run build` tek basina production kabul kaniti degildir.

Her release icin `docs/operations/production-release-evidence-template.md` kopyalanir ve tum zorunlu alanlar operator tarafindan doldurulur. Kanitsiz zorunlu madde `NO-GO` kabul edilir.

## Scheduler Gozlemlenebilirligi

- Outbox endpoint'i en az dakikada bir, giris guvenligi bakimi en az saatte bir calistirilir.
- `npm run db:backup:run` ve `npm run system-jobs:maintain` gunde bir calistirilir.
- `npm run system-alerts:run` en az dakikada bir calistirilir ve non-zero cikisi bagimsiz dead-man alarmi uretir.
- Her cagrinin cevabindaki `x-request-id` scheduler logunda saklanir.
- `/api/health` icindeki `systemJobs` degeri `degraded` ise `/admin/entegrasyonlar` ekranindan eksik, gecikmis veya basarisiz is belirlenir.
- Warning/critical heartbeat, lease ve run-history retention degerleri uretim ortamina acikca tanimlanir; preflight `lease < warning < critical` sirasini zorlar.
- Scheduler gecikmesi readiness kontrolunu kapatmaz; trafik kesmek yerine operasyon alarmi uretilir.

Detayli model ve guvenlik kararlari icin `docs/architecture/observability-and-system-jobs.md` kullanilir.

## 1. Release Oncesi

1. Temiz commit uzerinde `npm ci` calistirilir.
2. `npm run check` lint, tum testler ve production build'i tamamlar.
3. `npm run prisma:migrate:verify` uygulanmis migration adlarini ve checksum'larini repository ile karsilastirir.
4. Production secret ve servis degerleri deployment platformuna tanimlanir.
5. Ayni environment ile `npm run preflight:production` calistirilir.
6. Migration veya environment preflight basarisizsa release durdurulur; cikti SQL, secret veya mutlak veritabani yolu gostermez.

Zorunlu gruplar:

- Veritabani: production'a ozel, mutlak ve kalici volume'u gosteren `file:` `DATABASE_URL`.
- Backup: ayri failure domain'de S3/R2 bucket ve zorunlu server-side encryption.
- Origin: HTTPS `NEXT_PUBLIC_SITE_URL`, `OUTBOX_BASE_URL`, `MAINTENANCE_BASE_URL`, `BACKUP_BASE_URL`, `SYSTEM_ALERT_BASE_URL`.
- Auth: birbirinden farkli ve en az 32 karakterlik runtime secret'lari.
- Proxy: yalniz forwarding header'larini overwrite eden proxy arkasinda `AUTH_TRUST_PROXY=true` ve tek `AUTH_CLIENT_IP_HEADER`.
- E-posta: SMTP provider, host, TLS ve gonderici.
- Medya: acik `LOCAL` veya eksiksiz `S3` konfigurasyonu.
- Alarm: webhook provider, HTTPS/443 allowlist hedefi, ayri HMAC secret ve receiver idempotency kabul kaniti.
- City Lojistik: adapter kabulü tamamlanana kadar `CITY_LOJISTIK_ENABLED=false`.

## 2. Veritabani Ve Backup

1. Mevcut production veritabaninin dogrulanmis backup'i alinir.
2. Manifest checksum ve restore provasi kontrol edilir.
3. `npm run prisma:migrate:deploy` ile yalniz repository migration'lari uygulanir.
4. Migration hatasinda yeni uygulama surumu baslatilmaz.

SQLite kullaniliyorsa tek-writer deployment, kalici disk, dosya kilidi ve ayni volume'da atomik backup zorunludur. Yatay olcekleme karari verilirse once PostgreSQL gecisi planlanir.

## 3. Uygulama Acilisi

1. Yeni surum baslatilir.
2. `GET /api/health/live` HTTP 200 vermelidir; bu yalniz proses liveness kontroludur.
3. `GET /api/health/ready` HTTP 200 ve `status=ready` vermelidir.
4. `GET /api/health` operasyon sinyallerinde `error` olmamalidir.
5. Readiness 503 ise trafik yeni surume yonlendirilmez.
6. HTTPS yanitlarinda HSTS, CSP `frame-ancestors`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` ve `Permissions-Policy` dogrulanir.

## 4. Scheduler Kabulü

- Outbox worker duzenli aralikla `npm run outbox:run` calistirir.
- Auth rate-limit bakimi `npm run auth-rate-limit:maintain` ile planlanir.
- Backup gorevi `npm run db:backup:run` calistirir, atomik bundle uretir ve restore provasini tamamlar.
- Run-history retention `npm run system-jobs:maintain` ile gunluk calistirilir.
- Sistem alarm degerlendirme ve teslimi `npm run system-alerts:run` ile en az dakikada bir calistirilir.
- Gorevler tek instance veya dagitik lock ile calisir; ayni cron paralel baslatilmaz.
- Admin `/admin/entegrasyonlar` ekraninda gecikmis, dead-letter ve isleyicisiz topic sayilari sifirlanmadan kabul tamamlanmaz.

## 5. Smoke Ve Rollback

1. Admin ve bayi oturum smoke akislari production benzeri ortamda tamamlanir.
2. Aktivasyon e-postasi, medya yukleme, siparis ve stok rezervasyon akislari kontrol edilir.
3. Kritik hata halinde trafik onceki uygulama surumune dondurulur.
4. Migration geriye uyumlu degilse veritabani yalniz dogrulanmis backup ve yazili restore proseduruyle geri alinir.
5. Rollback nedeni, correlation ID'ler ve etkilenen release commit'i audit olayina kaydedilir.
