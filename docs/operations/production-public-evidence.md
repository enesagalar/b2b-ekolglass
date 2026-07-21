# Production Public Evidence Collector

## Amac

Bu arac deploy edilmis portalin public yuzeylerinden ve dahili is rotalarinin yalniz yetkisiz erisim sinirindan secret-safe release kaniti toplar. Tek basina `GO` karari vermez; sonuc her zaman operator kaniti gerektiren release kaydinin bir parcasidir.

## Zorunlu Girdiler

```bash
npm run evidence:collect -- \
  --base-url=https://portal.ekolglass.com \
  --expected-commit-sha=<40-karakter-sha> \
  --expected-artifact-digest=sha256:<64-hex> \
  --expected-release-id=<deployment-release-id> \
  --expected-dns-targets=<onayli-cname-veya-ip> \
  --output=.test-data/production-public-evidence.json
```

GitHub Actions altinda ayni akis `Production Public Evidence` workflow'u manuel calistirilarak kullanilir. Workflow beklenen commit'i checkout eder, Node testlerini calistirir, public collector sonucunu her durumda 30 gunluk artifact olarak yukler ve zorunlu public kontrolde non-zero sonuc verir.

## Dogrulananlar

- Deploy edilen `/api/health/live` release SHA, artifact digest ve release ID'sinin beklenen degerlerle birebir eslesmesi.
- Liveness, readiness ve operasyon health durumlari.
- Health endpoint'lerinde `Cache-Control: no-store`.
- HSTS, CSP frame siniri, nosniff, frame, referrer ve permissions policy basliklari.
- HTTP'den ayni host HTTPS'e yonlendirme.
- Robots private-route sinirlari ve canonical sitemap bildirimi.
- Sitemap'in yalniz `/`, `/urunler` ve `/bayi-basvurusu` rotalarini icermesi.
- DNS sonucunun public adreslere cozulmesi ve onayli CNAME/IP hedeflerinden biriyle eslesmesi.
- TLS zinciri/hostname dogrulamasi ve en az 30 gun sertifika suresi.
- Bes dahili cron endpoint'inin sabit, kisa ve gecersiz bearer token ile `401` vermesi; JSON hata sozlesmesi, `no-store`, request ID ve cookie uretmeme siniri.
- Collector checkout'unun beklenen commit'te ve temiz olmasi.

## Guvenlik Siniri

- Base URL yalniz temiz HTTPS origin olabilir; localhost yalniz acik test bayragiyla kabul edilir.
- Response govdeleri en fazla 64 KB okunur.
- Yalniz allowlist header ve JSON alanlari kaydedilir.
- Cookie, authorization, set-cookie, raw exception, PEM, environment dump veya signed URL kaydedilmez.
- Dahili endpoint problari tek istektir, retry yapmaz ve gercek cron secret'larini environment'tan okumaz.
- Reverse proxy `/api/internal/*` isteklerinde `Authorization` header'ini eklememeli veya degistirmemelidir; aksi halde bu guvenlik probi calistirilmaz.
- Robots govdesi ve gecersiz/query iceren sitemap URL'si artifact'e yazilmaz.
- Artifact basarisiz kontrolde de uretilir; `releaseDecision` degeri yine `OPERATOR_EVIDENCE_REQUIRED` kalir.

## Kapsam Disi

Bu arac gercek S3 upload/read, SMTP teslimi, offsite backup/restore, scheduler/dead-man, authenticated tenant smoke, rollback veya insan onayini kanitlamaz. Commit seviyesindeki migration ve recovery kaniti CI'daki `recovery:drill` artifact'inden; dis ortam kabulleri `production-release-evidence-template.md` icindeki erisim kontrollu kayitlardan tamamlanir.

`npm run smoke:admin` production veritabaninda calistirilmaz. Script sentetik kullanici ve operasyon kayitlari olusturdugu icin yalniz her kosuda sifirlanan izole CI/staging veritabanina karsi kullanilir.
