# OCI Release Artifact Sozlesmesi

## Amac

Uygulama kaynak koddan production ortaminda yeniden build edilmez. `main` CI'i tek bir `linux/amd64` OCI image'i uretir, GHCR'ye commit SHA etiketiyle yollar ve registry'nin verdigi manifest digest'ini release kimligi kabul eder.

## Kimlik Zinciri

- Kaynak kimligi: tam 40 karakter Git commit SHA.
- Artifact kimligi: `ghcr.io/enesagalar/b2b-ekolglass@sha256:<registry-digest>`.
- Build kaniti: buildx metadata, SBOM, provenance, fixable high/critical image taramasi ve GitHub artifact attestation.
- Runtime kimligi: `APP_COMMIT_SHA`, `APP_ARTIFACT_DIGEST` ve platformun verdigi `APP_RELEASE_ID`.
- Public dogrulama: `/api/health/live` runtime kimligini dondurur; evidence collector bunu beklenen release manifestiyle karsilastirir.

Bir OCI arsiv dosyasinin SHA-256 checksum'u registry manifest digest'i degildir. Deploy ve rollback yalniz registry digest'i ile yapilir.

## Container Sozlesmesi

- Node taban image'i digest ile sabittir.
- Runtime `node` kullanicisi ile calisir.
- SQLite, backup ve LOCAL medya ayni kalici `/data` volume agacini kullanir.
- Production platformu tek replica ve `Recreate` semantigi saglamalidir.
- Root filesystem salt okunur olabilir; yalniz `/data` ve zorunlu runtime cache alani yazilabilir baglanir.
- Liveness `/api/health/live`, trafik readiness kapisi `/api/health/ready` olur.

Container baslangic sirasi fail-closed ilerler:

1. Production environment preflight.
2. Mevcut SQLite icin dogrulanmis release-oncesi backup.
3. Uygulanmis migration checksum kontrolu; yalniz pending migration kabul edilir.
4. `prisma migrate deploy`.
5. Tam migration integrity kontrolu.
6. Next.js prosesinin baslamasi.

Bu adimlardan biri kalirsa uygulama prosesi acilmaz.

## Rollback Sozlesmesi

`deploy/rollback-manifest.schema.json` mevcut ve onceki release kimliklerini, iki farkli registry digest'ini, migration uyumluluk sinifini ve dogrulanmis pre-migration backup kanitini zorunlu tutar.

Manifest `npm run rollback:validate -- --manifest=<dosya>` ile dogrulanir. Platform adapteri secilene kadar bu komut trafik degistirmez veya veri restore etmez.

## Guven Siniri

CI artifact uretimi kodla kanitlanabilir. Registry retention, package gorunurlugu, platform volume'u, tek replica, DNS/TLS, SMTP, object storage, offsite restore, scheduler ve trafik rollback'i gercek deployment kaniti gerektirir.
