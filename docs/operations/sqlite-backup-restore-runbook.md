# SQLite Backup ve Restore Runbook

## Kapsam

Bu akis yalniz `DATABASE_URL=file:...` kullanan SQLite deployment'lari icindir. Canli veritabanini durdurmadan online snapshot alir; restore verification aktif DB'ye yazmaz.

## Environment

```env
DATABASE_URL="file:./dev.db"
DATABASE_BACKUP_ROOT="./backups/database"
```

Production backup root uygulama deploy dizininden bagimsiz, kalici ve erisimi sinirli bir volume olmalidir. Backup dosyalari web root altinda servis edilmez.

Scheduler ayrica `BACKUP_CRON_SECRET`, `BACKUP_BASE_URL`, warning/critical heartbeat ve `BACKUP_JOB_LEASE_MINUTES` degerlerini kullanir.

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

Komut JSON sonucunda yalniz dosya adlarini, boyutu, hash'i ve correlation ID'yi doner; mutlak host yolu veya secret loglanmaz. Scheduler non-zero exit'i kritik alarm saymalidir.

## Izole Restore Provasi

```bash
npm run db:restore:verify -- "C:\\backups\\ekolglass-....sqlite"
```

Prova once manifest boyut/hash kontrolu yapar, snapshot'i gecici dizine kopyalar ve kopyayi read-only acar. Integrity, foreign key, migration fingerprint ve kritik tablo sayimlari tekrar dogrulanir. Gecici dosya her durumda silinir; canli DB degismez.

## Medya Reconciliation

Lokal provider icin:

```bash
npm run media:reconcile
npm run media:reconcile -- --sample-limit=50
```

Rapor aktif/pasif referanslari, eksik nesneleri, orphan dosyalari ve gecersiz adlari sayar. Bu komut silme yapmaz. `S3` provider'da nesne listeleme sozlesmesi kurulmadan fail-closed cikar; provider lifecycle/versioning ayarlari ayri kontrol edilir.

## Production Kabul

1. Backup komutu basarili ve manifest guvenli backup volume'unda.
2. Ayni dosya icin restore verification basarili.
3. Canli DB hash ve satir sayilari restore provasindan etkilenmemis.
4. Lokal medya reconciliation'da aktif kayip nesne yok.
5. En az bir kopya farkli failure domain'e sifreli aktarilmis.
6. Retention ve silme politikasi deployment platformunda onaylanmis.

`DATABASE_BACKUP` sagligi yalniz yerel, restore edilmis snapshot'i kanitlar. Farkli failure domain'e sifreli aktarim tamamlanmadan felaket kurtarma kapsami tamamlanmis sayilmaz.
