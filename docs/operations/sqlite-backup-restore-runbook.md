# SQLite Backup ve Restore Runbook

## Kapsam

Bu akis yalniz `DATABASE_URL=file:...` kullanan SQLite deployment'lari icindir. Canli veritabanini durdurmadan online snapshot alir; restore verification aktif DB'ye yazmaz.

## Environment

```env
DATABASE_URL="file:./dev.db"
DATABASE_BACKUP_ROOT="./backups/database"
```

Production backup root uygulama deploy dizininden bagimsiz, kalici ve erisimi sinirli bir volume olmalidir. Backup dosyalari web root altinda servis edilmez.

## Backup

```bash
npm run db:backup
```

Komut:

1. `better-sqlite3` online backup API'siyle `.partial` snapshot uretir.
2. Snapshot uzerinde `PRAGMA integrity_check` ve `foreign_key_check` calistirir.
3. Repository migration dosyalarinin SHA-256 fingerprint'ini uygulanmis `_prisma_migrations` listesiyle karsilastirir.
4. Kritik tablo satir sayilari, dosya boyutu ve SHA-256 iceren versioned manifest yazar.
5. Yalniz tum kontroller basariliysa DB ve manifesti final adlarina atomik tasir.

Komut JSON sonucunda backup ve manifest yolunu doner. Scheduler non-zero exit'i kritik alarm saymalidir.

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
