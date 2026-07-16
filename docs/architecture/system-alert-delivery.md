# Sistem Alarm Teslim Sozlesmesi

## Kapsam

`SYSTEM_ALERT_DISPATCH`, scheduler sagligini degerlendirir ve bildirimleri e-posta worker'ina bagli olmadan transactional outbox uzerinden teslim eder. Public health endpoint'leri salt okunurdur; alarm olayi uretmez ve dis aga cikmaz.

Kalici yasam dongusu `SystemAlertState` tablosunda tutulur:

- `OPENED`: warning veya critical olay ilk kez aktif oldu.
- `ESCALATED`: aktif warning critical seviyeye yukseldi.
- `REMINDER`: critical olay tanimli hatirlatma suresince cozulmedi.
- `RECOVERED`: aktif olay `none` seviyesine dondu.

Ayni snapshot tekrar degerlendirildiginde yeni olay uretilmez. State versiyonu ve `system-alert:<jobKey>:<version>:<eventType>` idempotency anahtari ayni transaction icinde ilerler. Yeniden acilan olay onceki versiyonu devam ettirdigi icin yeni bir teslim kimligi alir.

## Webhook Guvenligi

- Production hedefi HTTPS/443 kullanir; userinfo, query ve fragment kabul edilmez.
- Host, `SYSTEM_ALERT_WEBHOOK_ALLOWED_HOSTS` icinde tam eslesmelidir; private, loopback ve link-local IP literal hedefler reddedilir.
- Redirect takip edilmez, timeout 1-30 saniye araliginda sinirlidir.
- URL, secret, request header ve provider response body loglanmaz veya kalici metadata'ya yazilmaz.
- Govde `x-ekolglass-timestamp` ve `x-ekolglass-signature: v1=<HMAC-SHA256>` ile imzalanir.
- `x-idempotency-key` her retry'da ayni outbox event kimligidir. Production receiver bu anahtarla idempotent olmadan kabul edilmez.

Teslim at-least-once semantigindedir. `408`, `425`, `429` ve `5xx` retry; diger `4xx` permanent dead-letter olur. Dead-letter replay mevcut permission, gerekce, CAS ve audit akisiyla yapilir.

## Dongusel Bagimlilik Siniri

Alarm dagiticisi kendi sagligini kendi webhook'u ile alarm haline getirmez. `SYSTEM_ALERT_DISPATCH` gecikmesi veya non-zero cikisi deployment scheduler'inin bagimsiz dead-man alarmiyla izlenir. Bu kural, alarm teslim hatti calismadiginda ayni hatta alarm uretmeye calisma dongusunu engeller.

## Production Kabul

1. `SYSTEM_ALERT_PROVIDER=webhook`, ayri cron/signing secret'lari, allowlist ve HTTPS endpoint preflight'tan gecmelidir.
2. `npm run system-alerts:run` duzenli aralikla calismali ve tek satir JSON sonucundaki correlation ID scheduler loguna alinmalidir.
3. Staging'de OPENED, ESCALATED, REMINDER ve RECOVERED olaylari ayni idempotency key ile retry dahil dogrulanmalidir.
4. Receiver bozuk imza, eski timestamp ve replay isteklerini reddetmelidir.
5. Alarm dagiticisi non-zero exit senaryosu bagimsiz scheduler alarmiyla kanitlanmalidir.
