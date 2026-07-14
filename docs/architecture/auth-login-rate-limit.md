# Auth Login Rate Limit Sozlesmesi

## Hedef

Bayi ve yonetim girislerini ayni guvenlik sinirinda, hesap ve ag kaynagi bazinda kaba kuvvet saldirilarina karsi korumak.

## Veri Modeli

`AuthLoginFailure` yalniz basarisiz kimlik dogrulama sinyallerini tutar.

- Ham e-posta veya IP saklanmaz.
- `emailKey`, normalize e-posta uzerinden HMAC-SHA256 ile uretilir.
- `ipKey`, yalniz guvenilir proxy'den cozulmus IP uzerinden HMAC-SHA256 ile uretilir.
- E-posta + zaman, IP + zaman ve expiry sorgulari ayri indekslidir.
- Kayitlar 24 saat sonra temizlenebilir; limit penceresi varsayilan 15 dakikadir.
- Basarili giris, yalniz ilgili e-posta anahtarinin hata kayitlarini temizler. IP sinyali diger hesaplara yonelik saldirilari izlemeye devam eder.

Audit log mevcut operasyon kaydi olarak korunur; limiter sorgulari JSON metadata uzerinden calismaz.

## Varsayilan Esikler

- E-posta: 15 dakikada 8 basarisiz deneme.
- IP: 15 dakikada 40 basarisiz deneme.
- E-posta ve IP limitleri bagimsizdir; herhangi birinin dolmasi girisi gecici olarak kapatir.
- Throttle cevabi hesap varligini aciga cikarmayan ortak mesajdir.
- Bilinmeyen veya kullanilamaz hesaplarda da dummy bcrypt karsilastirmasi yapilir.

Esikler `AUTH_LOGIN_WINDOW_MINUTES`, `AUTH_LOGIN_EMAIL_MAX_FAILURES` ve `AUTH_LOGIN_IP_MAX_FAILURES` ile yonetilir. Gecersiz degerler guvenli varsayilanlara doner.

## Proxy Guven Siniri

IP limiti varsayilan olarak kapali proxy guveniyle baslar. `AUTH_TRUST_PROXY=true` yalniz reverse proxy istemciden gelen forwarding basliklarini silip kendi dogruladigi degeri yeniden yaziyorsa acilir.

Desteklenen `AUTH_CLIENT_IP_HEADER` degerleri:

- `x-forwarded-for`
- `x-real-ip`
- `cf-connecting-ip`

Rastgele header adlari, gecersiz IPv4/IPv6 degerleri ve asiri uzun girdiler reddedilir. `x-forwarded-for` icin ilk adres, proxy'nin header'i overwrite ettigi deployment sozlesmesine gore istemci adresidir.

## Secret Yonetimi

Production ortaminda en az 32 karakterlik, ayri `AUTH_RATE_LIMIT_SECRET` zorunludur. Placeholder deger reddedilir. Secret rotasyonu mevcut limiter anahtarlarini degistirir; bu nedenle aktif hata penceresi sifirlanir ve rotasyon deployment kaydina yazilmalidir.

## Operasyon

1. Reverse proxy overwrite davranisini dogrula.
2. Proxy guvenini ve kullanilacak header'i environment'ta ac.
3. E-posta/IP esiklerini trafik ve NAT davranisina gore izle.
4. `expiresAt` indeksi uzerinden eski kayit temizligini scheduler'a bagla.
5. `auth.login.throttled` audit olaylarinda `email_limit` ve `ip_limit` dagilimini alarm metriğine donustur.
