# Production Auth ve E-posta Operasyon Runbook'u

## Kapsam

Bu runbook login rate-limit bakimi, transactional e-posta worker'i, reverse proxy guveni, secret rotasyonu ve alarm kontrollerini kapsar. Production credential degerleri repoya veya dokumana yazilmaz; deployment secret store'dan enjekte edilir.

## Deployment Oncesi Environment

### Auth ve Proxy

- `AUTH_SECRET`: oturumlar icin ortama ozel ve guclu secret.
- `AUTH_RATE_LIMIT_SECRET`: limiter HMAC anahtari; en az 32 karakter ve `AUTH_SECRET`ten farkli.
- `AUTH_TRUST_PROXY=true`: yalniz proxy forwarding header'ini overwrite ediyorsa.
- `AUTH_CLIENT_IP_HEADER`: `x-forwarded-for`, `x-real-ip` veya `cf-connecting-ip`.
- `AUTH_LOGIN_WINDOW_MINUTES`, `AUTH_LOGIN_EMAIL_MAX_FAILURES`, `AUTH_LOGIN_IP_MAX_FAILURES`: trafik/NAT davranisina gore onaylanmis esikler.
- `AUTH_RATE_LIMIT_EXPIRED_BACKLOG_THRESHOLD`: cleanup alarm esigi.

Proxy istemciden gelen ayni header'i silmeli ve dogruladigi istemci IP'sini yeniden yazmalidir. Bu davranis kanitlanmadan `AUTH_TRUST_PROXY` acilmaz.

### Bakim Scheduler'i

- `MAINTENANCE_CRON_SECRET`: ayri, en az 32 karakterlik secret.
- `MAINTENANCE_BASE_URL`: HTTPS portal origin'i.
- Saatlik veya en gec gunluk `npm run auth-rate-limit:maintain` calistirilir.
- Scheduler 30 saniye timeout ve non-zero exit alarmiyla izlenir.

### Transactional E-posta

- `EMAIL_PROVIDER=smtp`
- `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`
- Gerekliyse birlikte tanimli `SMTP_USER` ve `SMTP_PASSWORD`
- `CREDENTIAL_LINK_SECRET`, `OUTBOX_CRON_SECRET`, HTTPS `OUTBOX_BASE_URL`
- Outbox worker en az dakikada bir `npm run outbox:run` ile tetiklenir.

SMTP credential veya dogrulanmis gonderici domain bu repoda bulunmadigi icin production teslimi deployment sirasinda canli testle acilir; adapteri gecmek icin sahte endpoint kullanilmaz.

### Medya Storage

- Tek instance kurulumda `storage/media` kalici volume'a baglanir.
- Cok instance kurulumda S3/R2 uyumlu adapter ve CDN olmadan lokal disk kullanilmaz.
- Backup, restore ve object retention testi deployment kabulune dahildir.

## Scheduler Cagrilari

```bash
npm run auth-rate-limit:maintain
npm run outbox:run
npm run db:backup:run
npm run system-jobs:maintain
npm run system-alerts:run
```

Her komut bearer secret'i sadece process environment'tan okur. HTTP cevabi basarisizsa komut non-zero cikis ve correlation ID iceren kontrollu tek satir JSON uretir. Rate-limit temizligi ayni anda birden fazla calissa da yalniz `expiresAt <= now` kayitlarini silen idempotent bir islemdir.

## Health ve Alarmlar

`GET /api/health` su sinyalleri verir:

- `database`
- `outbox`
- `authentication`
- `systemJobs`
- `systemJobsSeverity`
- birlesik `status`

Alarm kurallari:

1. HTTP 503 aninda kritik alarm.
2. `status=degraded` iki ard arda kontrolde operasyon alarmi.
3. `authentication=degraded` icin admin dashboard `Giris guvenligi` sayaci incelenir.
4. Maintenance veya outbox cron non-zero exit aninda scheduler alarmi.
5. `auth.login.throttled`, `auth.rate_limit.cleanup` ve outbox dead/retry audit olaylari merkezi log sistemine aktarilir.

## Secret Rotasyonu

1. Yeni secret secret store'a eklenir.
2. Uygulama ve ilgili scheduler ayni deployment penceresinde guncellenir.
3. Eski scheduler durdurulur; yeni bearer ile 200 cevabi dogrulanir.
4. Eski secret iptal edilir.
5. Rotasyon audit/deployment kaydina yazilir.

`AUTH_RATE_LIMIT_SECRET` rotasyonu aktif limiter anahtarlarini degistirerek mevcut hata penceresini sifirlar. `CREDENTIAL_LINK_SECRET` rotasyonu acik aktivasyon/parola linklerini gecersizlestirir; kullanicilar icin yeni davet/link uretilmesi planlanir.

## Deployment Kabul Kontrolu

- Migration status guncel.
- `/api/health` 200 ve beklenen durum alanlarini donuyor.
- Yetkisiz maintenance/outbox POST istekleri 401.
- Yetkili maintenance cagrisi 200 ve audit kaydi uretiyor.
- SMTP test aktivasyonu hedef aliciya teslim oluyor; raw token loglanmiyor.
- Proxy spoof testi guvenilmeyen forwarding header'inin etkisiz oldugunu gosteriyor.
- Medya volume/object storage restart sonrasinda dosyayi koruyor.
- Backup restore tatbikati basarili.
- `npm run media:reconcile` aktif kayip nesne raporlamiyor.
