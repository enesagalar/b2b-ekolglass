# Production Deployment Kabul Runbook

## Amac

Bu runbook bir release'in migration, runtime konfigurasyonu, health kapilari ve arka plan isleriyle birlikte kontrollu acilmasini tanimlar. `npm run build` tek basina production kabul kaniti degildir.

## Scheduler Gozlemlenebilirligi

- Outbox endpoint'i en az dakikada bir, giris guvenligi bakimi en az saatte bir calistirilir.
- Her cagrinin cevabindaki `x-request-id` scheduler logunda saklanir.
- `/api/health` icindeki `systemJobs` degeri `degraded` ise `/admin/entegrasyonlar` ekranindan eksik, gecikmis veya basarisiz is belirlenir.
- `OUTBOX_HEARTBEAT_MAX_AGE_MINUTES`, `MAINTENANCE_HEARTBEAT_MAX_AGE_MINUTES` ve `SYSTEM_JOB_LEASE_MINUTES` uretim ortamina acikca tanimlanir.
- Scheduler gecikmesi readiness kontrolunu kapatmaz; trafik kesmek yerine operasyon alarmi uretilir.

Detayli model ve guvenlik kararlari icin `docs/architecture/observability-and-system-jobs.md` kullanilir.

## 1. Release Oncesi

1. Temiz commit uzerinde `npm ci` calistirilir.
2. `npm run check` lint, tum testler ve production build'i tamamlar.
3. Production secret ve servis degerleri deployment platformuna tanimlanir.
4. Ayni environment ile `npm run preflight:production` calistirilir.
5. Preflight basarisizsa release durdurulur; cikti yalniz eksik anahtar adlarini gosterir.

Zorunlu gruplar:

- Veritabani: production'a ozel `DATABASE_URL`.
- Origin: HTTPS `NEXT_PUBLIC_SITE_URL`, `OUTBOX_BASE_URL`, `MAINTENANCE_BASE_URL`.
- Auth: birbirinden farkli ve en az 32 karakterlik runtime secret'lari.
- E-posta: SMTP provider, host, TLS ve gonderici.
- Medya: acik `LOCAL` veya eksiksiz `S3` konfigurasyonu.
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

## 4. Scheduler Kabulü

- Outbox worker duzenli aralikla `npm run outbox:run` calistirir.
- Auth rate-limit bakimi `npm run auth-rate-limit:maintain` ile planlanir.
- Backup gorevi `npm run db:backup` calistirir ve manifestleri kalici depoya tasir.
- Gorevler tek instance veya dagitik lock ile calisir; ayni cron paralel baslatilmaz.
- Admin `/admin/entegrasyonlar` ekraninda gecikmis, dead-letter ve isleyicisiz topic sayilari sifirlanmadan kabul tamamlanmaz.

## 5. Smoke Ve Rollback

1. Admin ve bayi oturum smoke akislari production benzeri ortamda tamamlanir.
2. Aktivasyon e-postasi, medya yukleme, siparis ve stok rezervasyon akislari kontrol edilir.
3. Kritik hata halinde trafik onceki uygulama surumune dondurulur.
4. Migration geriye uyumlu degilse veritabani yalniz dogrulanmis backup ve yazili restore proseduruyle geri alinir.
5. Rollback nedeni, correlation ID'ler ve etkilenen release commit'i audit olayina kaydedilir.
