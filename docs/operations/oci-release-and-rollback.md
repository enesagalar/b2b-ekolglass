# OCI Release Ve Rollback Runbook

## CI Ciktisi

Basarili `main` CI kosusu GHCR image'ini SBOM ve provenance ile yollar, registry digest'ini buildx metadata'dan alir, GitHub attestation yayinlar ve release manifestini 90 gunluk artifact olarak saklar.

Release operatoru etiketi degil `immutableReference` alanindaki digest'li referansi deploy eder.

## Ilk Deploy Kontrolu

- GHCR paketi deployment identity tarafindan okunabiliyor.
- Release manifest commit'i onaylanan Git commit ile ayni.
- Attestation repository ve workflow kimligiyle dogrulaniyor.
- `DATABASE_URL=file:/data/database/production.db`.
- `DATABASE_BACKUP_ROOT=/data/backups`.
- LOCAL medya secildiyse `MEDIA_LOCAL_ROOT=/data/media`; tercih edilen production modeli S3/R2'dir.
- Platform tek replica, kalici `/data`, `Recreate` ve readiness-before-traffic sagliyor.
- `APP_ARTIFACT_DIGEST` release manifestindeki `registryDigest` degeridir.
- `APP_RELEASE_ID` platformun degistirilemez release kimligidir.

## Release

1. Onceki saglikli digest ve release ID kaydedilir.
2. Offsite backup ve restore kaniti kontrol edilir.
3. Yeni digest'li image baslatilir; container kendi preflight, backup ve migration zincirini tamamlar.
4. `/api/health/live`, `/api/health/ready` ve `/api/health` kontrol edilir.
5. Public evidence collector beklenen commit, digest ve release ID ile calistirilir.
6. Readiness ve operasyon kabulleri gecmeden trafik acilmaz.

## Rollback

1. `deploy/rollback-manifest.example.json` erisim kontrollu kanit dosyasina kopyalanir ve gercek degerlerle doldurulur.
2. `npm run rollback:validate -- --manifest=<dosya>` basarili olmalidir.
3. `BACKWARD_COMPATIBLE` ise onceki image digest'i deploy edilir ve readiness sonrasi trafik dondurulur.
4. `RESTORE_REQUIRED` ise trafik kapali tutulur; yalniz manifestteki dogrulanmis pre-migration backup restore edilir, ardindan onceki image digest'i acilir.
5. Public evidence ve sentetik authenticated smoke tekrar edilir.
6. Neden, release ID, digest, backup manifesti ve correlation ID operator kaydina eklenir.

Platform komutlari hosting seciminden sonra bu runbook'a eklenir. Kaynak koddan yeniden build ederek rollback yapilmaz.
