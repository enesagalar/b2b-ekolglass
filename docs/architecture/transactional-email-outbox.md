# Transactional E-posta ve Outbox Sozlesmesi

## Kapsam

Aktivasyon, parola sifirlama, siparis ve teklif bildirimleri ayni provider-bagimsiz `EmailProvider` sozlesmesini kullanir. Ilk production adapteri standart SMTP'dir. Business transaction'i SMTP cagrisini beklemez; versiyonlu olay ayni DB transaction'inda outbox'a yazilir.

## Guvenlik Invariantlari

1. Aktivasyon ve parola sifirlama ham tokenlari DB, outbox payload, audit log veya entegrasyon logunda saklanmaz.
2. Ham token `tokenId + purpose + CREDENTIAL_LINK_SECRET` uzerinden HMAC-SHA256 ile gecici olarak turetilir; token tablosunda yalniz SHA-256 hash bulunur.
3. Credential worker, tokenin sure, revoke, consume, kullanici ve firma durumunu teslim aninda yeniden dogrular.
4. Production server action ham link dondurmez. `ALLOW_MANUAL_*` bayraklari production istisnasi olusturmaz.
5. Alici adresi event payload'ina konmaz; worker aggregate/user kimliginden DB uzerinden cozer.
6. Worker endpoint'i yalniz `POST` kabul eder ve en az 32 karakterlik ayri `OUTBOX_CRON_SECRET` Bearer degerini sabit zamanli karsilastirir.
7. SMTP credential, bearer/token ve hassas query degerleri entegrasyon log ozetlerinde redakte edilir.

## Worker Siniri

- Endpoint: `POST /api/internal/outbox`
- Yerel/cron tetigi: `npm run outbox:run`
- Her cagri yalniz bir e-posta olayini claim eder.
- E-posta worker'i yalniz kendi exact, versioned topic allowlist'ini claim eder. Shipping olaylari e-posta worker'i tarafindan degistirilemez.
- SMTP connect/greeting/socket timeout degerleri lease suresinden kisa tutulur.
- Production SMTP baglantisi STARTTLS/implicit TLS olmadan teslim yapmaz; mutlak teslim deadline'i lease suresinden kisadir.
- Provider kabulunden hemen sonra proses cokmesi halinde SMTP seviyesinde kesin exactly-once garanti yoktur. Deterministik `Message-ID` kullanilir; operasyon modeli at-least-once kabul edilir ve tekrar teslim olasiligi izlenir.

## Environment

Production icin `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, opsiyonel birlikte tanimli `SMTP_USER/SMTP_PASSWORD`, HTTPS `NEXT_PUBLIC_SITE_URL`, `CREDENTIAL_LINK_SECRET` ve `OUTBOX_CRON_SECRET` gerekir. Scheduler bu endpoint'i periyodik cagirir; secret uygulama ve scheduler secret store'unda tutulur.

Bilinen placeholder secret degerleri runtime tarafindan reddedilir. `CREDENTIAL_LINK_SECRET` rotasyonu acik credential baglantilarini gecersizlestirdigi icin en uzun token suresi olan 48 saatlik kontrollu gecis penceresi ve davet yeniden uretimiyle yapilir; production'da `AUTH_SECRET` fallback'i kullanilmaz.

## Sonraki Operasyon Dilimi

`/admin/entegrasyonlar` ekraninda PENDING/RETRY/DEAD sayilari, topic ve hata kodu bazli filtre, yetkili replay ve backlog alarm esikleri gorunur hale getirilecektir. Ham payload, credential ve tam provider cevabi arayuzde gosterilmeyecektir.
