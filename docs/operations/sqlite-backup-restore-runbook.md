# SQLite Backup ve Restore Runbook

## Kapsam

Bu akis yalniz `DATABASE_URL=file:...` kullanan SQLite deployment'lari icindir. Canli veritabanini durdurmadan online snapshot alir; restore verification aktif DB'ye yazmaz.

## Environment

```env
DATABASE_URL="file:./dev.db"
DATABASE_BACKUP_ROOT="./backups/database"
BACKUP_OFFSITE_PROVIDER="S3"
BACKUP_S3_BUCKET="ekolglass-production-backups"
BACKUP_S3_REGION="eu-central-1"
BACKUP_S3_PREFIX="portal/database-backups"
BACKUP_S3_SERVER_SIDE_ENCRYPTION="AES256"
BACKUP_S3_UPLOAD_TIMEOUT_MS="120000"
```

Production backup root uygulama deploy dizininden bagimsiz, kalici ve erisimi sinirli bir volume olmalidir. Backup dosyalari web root altinda servis edilmez.

Scheduler ayrica `BACKUP_CRON_SECRET`, `BACKUP_BASE_URL`, warning/critical heartbeat ve `BACKUP_JOB_LEASE_MINUTES` degerlerini kullanir.

Production'da `BACKUP_OFFSITE_PROVIDER=S3` zorunludur. AWS S3, Cloudflare R2 veya S3 uyumlu ayri bir hesap/bucket kullanilabilir. Statik credential kullaniliyorsa access key ve secret birlikte tanimlanir; workload identity kullaniliyorsa ikisi de bos birakilir. `aws:kms` seciminde `BACKUP_S3_KMS_KEY_ID` zorunludur.

## Backup

```bash
npm run db:backup
```

Bu komut manuel ve yerel snapshot aracidir. Izlenen production scheduler komutu:

```bash
npm run db:backup:run
```

Komut:

1. `better-sqlite3` online backup API'siyle `.partial` snapshot uretir.
2. Snapshot uzerinde `PRAGMA integrity_check` ve `foreign_key_check` calistirir.
3. Repository migration dosyalarinin SHA-256 fingerprint'ini uygulanmis `_prisma_migrations` listesiyle karsilastirir.
4. Kritik tablo satir sayilari, dosya boyutu ve SHA-256 iceren versioned manifest yazar.
5. Database ve manifesti izinleri sinirli gecici bundle dizininde hazirlar.
6. Lease checkpoint'i gecerliyse bundle dizinini tek rename ile atomik olarak yayinlar.
7. Scheduler akisi yayinlanan snapshot uzerinde izole restore provasi yapar; job ancak bundan sonra `SUCCEEDED` olur.
8. Dogrulanmis database nesnesi once, manifest nesnesi son yazilacak sekilde content-addressed S3/R2 anahtarina aktarilir.
9. Aktarim SHA-256 transport checksum'i, private bucket politikasi ve `AES256` veya `aws:kms` server-side encryption zorunluluguyla yapilir.
10. Her S3 nesne aktarimi acik timeout ile sinirlanir; timeout backup lease suresinden kisa olmak zorundadir.
11. Database ve manifest aktarimlari arasinda lease heartbeat yenilenir; lease kaybi manifest yayinini engeller.
12. Offsite aktarim basarisizsa `DATABASE_BACKUP` isi `FAILED` olur ve sistem alarm yasam dongusune girer.

Komut JSON sonucunda yalniz dosya adlarini, boyutu, hash'i ve correlation ID'yi doner; mutlak host yolu veya secret loglanmaz. Scheduler non-zero exit'i kritik alarm saymalidir.

## Izole Restore Provasi

Her commit icin sifirdan migration ve seed uygulayan, snapshot olusturup izole geri yuklemeyi dogrulayan CI provasi:

```bash
npm run recovery:drill
```

Bu prova migration checksum'larini, tamamlanmis backup sayfalarini, integrity/foreign key kontrollerini, kritik tablo sayimlarini ve kaynak veritabaninin hash bazinda degismedigini kanitlar. `.test-data` altindaki gecici veriler basarili kanit yazilmadan once silinir. CI artifact'i production backup'i, offsite kopyayi veya gercek felaket kurtarma provasini ikame etmez.

```bash
npm run db:restore:verify -- "C:\\backups\\ekolglass-....sqlite"
```

Prova once manifest boyut/hash kontrolu yapar, snapshot'i gecici dizine kopyalar ve kopyayi read-only acar. Integrity, foreign key, migration fingerprint ve kritik tablo sayimlari tekrar dogrulanir. Gecici dosya her durumda silinir; canli DB degismez.

## Medya Reconciliation

Aktif LOCAL veya S3 medya provider'i icin:

```bash
npm run media:reconcile
npm run media:reconcile -- --sample-limit=50
```

Rapor yalniz aktif provider'a ait veritabani referanslarini; eksik, orphan ve gecersiz nesneleri sayar. S3 listeleme sayfalidir ve varsayilan 100.000 nesne guvenlik sinirina sahiptir. Bu komut silme yapmaz; provider lifecycle/versioning ayarlari ayri kontrol edilir.

## Production Kabul

1. Backup komutu basarili ve manifest guvenli backup volume'unda.
2. Ayni dosya icin restore verification basarili.
3. Canli DB hash ve satir sayilari restore provasindan etkilenmemis.
4. Lokal medya reconciliation'da aktif kayip nesne yok.
5. En az bir kopya farkli failure domain'e sifreli aktarilmis.
6. Retention ve silme politikasi deployment platformunda onaylanmis.
7. Offsite bucket public erisime kapali ve uygulama runtime hesabindan bagimsiz recovery yetkilisi tanimli.
8. En az bir offsite nesne periyodik felaket kurtarma provasinda indirilip `db:restore:verify` ile dogrulanmis.

`DATABASE_BACKUP` basarisi yerel restore provasi ile sifreli offsite aktarimin ikisini birlikte kanitlar. Offsite nesnenin farkli bir recovery ortaminda indirilip restore edilmesi yine periyodik operasyon kabul adimidir.
