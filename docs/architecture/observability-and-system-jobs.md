# Gozlemlenebilirlik ve Zamanlanmis Isler

## Amac

Bu katman uygulama hatalarini, HTTP isteklerini ve zamanlanmis islerin calisma durumunu tek bir operasyon modelinde izlenebilir hale getirir. Islem kaydi ile guvenlik denetim kaydi birbirinden ayridir:

- `structuredLog`: Uygulama ve altyapi olaylari icin tek satir JSON log uretir.
- `AuditLog`: Kim, hangi ticari veya yonetsel islemi yapti sorusunun kalici cevabidir.
- `SystemJobRun`: Her scheduler cagrisinin calisma gecmisidir.
- `SystemJobState`: Bir isin son durumu ve aktif lease kaydidir.

Izlenen is anahtarlari `EMAIL_OUTBOX`, `AUTH_RATE_LIMIT_MAINTENANCE`, `DATABASE_BACKUP`, `SYSTEM_JOB_RETENTION` ve `SYSTEM_ALERT_DISPATCH` olarak tanimlidir.

## Korelasyon Kimligi

Her izlenen istek icin sunucu yeni bir UUID uretir. Istemciden gelen `x-request-id` guvenilir kabul edilmez ve yeniden kullanilmaz. Kimlik:

- HTTP cevabinda `x-request-id` olarak doner.
- Kontrollu hata cevaplarinda `correlationId` olarak yer alir.
- Yapilandirilmis loglara ve zamanlanmis is kaydina yazilir.

Bu sayede kullaniciya gosterilen guvenli hata ile sunucu logu ayni islem uzerinden eslestirilebilir.

## Log Guvenligi

Logger; authorization, cookie, parola, secret, token, API anahtari, credential, veritabani URL'si, e-posta ve telefon degerlerini maskeler. Nesne derinligi, alan sayisi, dizi uzunlugu ve toplam log boyutu sinirlidir. Hata cevaplarinda ham exception mesaji veya stack trace kullaniciya donulmez.

Uretimde stdout/stderr JSON akisi merkezi bir log servisine yonlendirilmelidir. Log depolama sisteminde `event`, `correlationId`, `level` ve `timestamp` alanlari indekslenmelidir.

## Scheduler Lease Modeli

`beginSystemJobRun` tek bir is anahtari icin atomik lease almaya calisir. Aktif ve suresi dolmamis lease varsa ikinci worker `409` alir. Lease sahibi:

1. `SystemJobRun` kaydini `RUNNING` durumunda acar.
2. Isi calistirir ve gerekiyorsa heartbeat yeniler.
3. Sonucu `SUCCEEDED` veya `FAILED` olarak kapatir.
4. `SystemJobState` ozetini ve ardisik hata sayisini gunceller.

Lease suresi `SYSTEM_JOB_LEASE_MINUTES` ile belirlenir. Uzun sureli isler `heartbeatSystemJobRun` cagirmadan lease suresini asmamalidir.

Database backup icin ayri `BACKUP_JOB_LEASE_MINUTES` kullanilir. Heartbeat ve finish yalniz suresi dolmamis lease sahibi tarafindan yapilabilir. Yeni worker suresi dolmus lease'i devraldiginda onceki `RUNNING` kaydi `LEASE_EXPIRED` hatasiyla kapanir. Backup bundle'i publish edilmeden hemen once lease checkpoint'i tekrar dogrulanir.

## Saglik Esikleri

- E-posta outbox: warning 6, critical 10 dakika.
- Giris guvenligi bakimi: warning 90, critical 180 dakika.
- Database backup: warning 1500, critical 2160 dakika.
- Is gecmisi retention: warning 1500, critical 2160 dakika.
- Sistem alarm dagitimi: warning 6, critical 10 dakika; provider kapaliyken `disabled`.
- E-posta saglayicisi devre disiyken outbox isi `disabled` kabul edilir.

Warning esigi asildiginda operasyon uyarisi, critical esigi veya `SYSTEM_JOB_CRITICAL_AFTER_FAILURES` kadar ardisik hata asildiginda kritik alarm uretilir. Eksik, basarisiz veya gecikmis scheduler kaydi `/api/health` sonucunu `degraded` yapar. Bu durum `/api/health/ready` sonucunu 503 yapmaz; scheduler problemi yeni HTTP trafiginin veritabani ve depolama baglantilarini kullanmasini engellemez.

Basarili run kayitlari varsayilan 14, hatali run kayitlari 90 gun tutulur. `SYSTEM_JOB_RETENTION_BATCH_SIZE` her calismada silinebilecek kayit sayisini sinirlar; `RUNNING` kayitlar ve `SystemJobState` silinmez.

Admin kullanicisi guncel durumu `/admin/entegrasyonlar` ekranindaki **Zamanlanmis isler** bolumunden izler.

Alarm durumu ve teslim sagligi ayni sey degildir. `SystemAlertState` warning/critical yasam dongusunu, `system.alert.notification.v1` outbox topic'i ise provider teslimini tutar. OPENED, ESCALATED, REMINDER ve RECOVERED gecisleri kalici version ve idempotency anahtariyla uretilir. Webhook HMAC, host allowlist, timeout ve redirect kapisi `docs/architecture/system-alert-delivery.md` icinde tanimlidir.

## Operasyon Sonrasi Adimlar

- Stdout/stderr JSON akisini alacak merkezi log servisi secilecek ve indeksler kurulacak.
- Provider-neutral alarm webhook'u staging receiver ile etkinlestirilip teslim kaniti alinacak.
- Yerel backup bundle'lari farkli failure domain'e sifreli tasiyacak saglayici secilecek.
