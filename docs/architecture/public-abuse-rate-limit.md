# Public Abuse Rate-Limit Sozlesmesi

## Kapsam

Bu sozlesme public bayi basvurusu, davet aktivasyonu ve bayi parola sifirlama mutation'larini korur. Login limiter'i mevcut `AuthLoginFailure` modeliyle ayri kalir.

## Veri Minimizasyonu

- `SecurityRateLimitBucket` yalniz scope, key type, HMAC hash, pencere ve sayac tutar.
- HMAC anahtari `AUTH_RATE_LIMIT_SECRET` ve domain-separated scope ile uretilir.
- Credential IP anahtari aktivasyon ve parola sifirlama arasinda ortaktir; global IP kovasi iki akisi birlikte sinirlar.
- Ham IP, ham token, telefon ve vergi numarasi guard tablolarina yazilmaz.
- Bayi basvurusundaki e-posta is kaydinda is gereksinimi olarak saklanir; limiter'da yalniz HMAC'i bulunur.

## Varsayilan Esikler

| Akis | Pencere | Konu limiti | Flow IP limiti | Global IP limiti |
| --- | ---: | ---: | ---: | ---: |
| Bayi basvurusu | 60 dk | 3 e-posta | 10 IP | - |
| Aktivasyon | 15 dk | 8 token | 20 IP | 40 credential IP |
| Parola sifirlama | 15 dk | 8 token | 20 IP | 40 credential IP |

Bayi duplicate claim penceresi 24 saattir. Sayaçlar atomik SQLite `ON CONFLICT ... RETURNING` ile artar; izin verilen esikten sonraki istek is verisine erismeden reddedilir.

## Transaction Sinirlari

- Bayi duplicate claim, `DealerApplication`, created audit ve claim tamamlama ayni transaction'dadir.
- Claim token eszamanli ayni e-postada yalniz bir transaction'in is kaydi uretmesini saglar.
- Credential limiter token lookup'tan once atomik tuketilir; basarili consume yalniz token konu kovasini temizler, IP kovalarini sifirlamaz.
- Failure audit yazimi ham IP/token icermez. Throttled tekrarlar yeni audit satiri uretmez.
- Maintenance expired login failure, security bucket ve duplicate claim satirlarini audit ile ayni transaction'da temizler.

## Guven Siniri

Production preflight guvenilir reverse proxy sozlesmesini zorunlu kilar. Runtime'da client IP cozulemezse public mutation fail-closed reddedilir. Veritabani korumasi CDN/WAF yerine gecmez; body boyutu, baglanti ve volumetrik rate-limit ingress katmaninda ayrica uygulanir.
