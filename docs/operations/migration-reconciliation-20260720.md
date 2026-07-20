# Migration Checksum Reconciliation - 2026-07-20

## Kapsam

Bu kayit yalniz yerel `dev.db` icindeki iki tarihsel checksum farkini kapsar. Migration SQL dosyalari ve is verileri degistirilmez. Baska staging veya production veritabanlarinda ayni metadata islemi kanit toplanmadan uygulanamaz.

## Onayli Farklar

- `20260713133500_harden_order_checkout`: uygulanmis `c94862c4...fe304`, repository `d5f3c522...c8be1`. Fark eski `StockReservation.updatedAt` verisini `createdAt` ile dolduran veri tasima guvenligidir; nihai schema degismez.
- `20260713171000_add_quote_order_conversion`: uygulanmis `f904daba...c138`, repository `b2375c91...c477`. Migration commit oncesi working tree'den uygulanmistir; eski blob Git history'de bulunmamistir.

## Kabul Kaniti

- Repository ve uygulanmis migration sayisi: 32.
- `PRAGMA integrity_check`: `ok`.
- `PRAGMA foreign_key_check`: ihlal yok.
- `prisma migrate diff --from-migrations prisma/migrations --to-config-datasource --exit-code`: fark yok.
- Ilgili `StockReservation`, donusturulmus siparis ve yetim teklif kaydi bulunmuyor.
- Mutabakat araci schema fingerprint ve kritik is tablosu satir sayilarini islem oncesi/sonrasi esit tutar.

## Kontrollu Islem

Dry-run varsayilandir:

```powershell
npm run prisma:migrate:reconcile
```

Uygulama once otomatik, restore edilmis SQLite snapshot olusturur; ardindan eski checksum'i `WHERE` guard olarak kullanan tek transaction calistirir:

```powershell
npm run prisma:migrate:reconcile -- --apply
npm run prisma:migrate:verify
npx prisma migrate diff --from-migrations prisma/migrations --to-config-datasource --exit-code
```

Beklenmeyen migration, checksum, schema fingerprint veya satir sayisi mutasyonu islemi durdurur. Son dogrulama basarisizsa metadata degisiklikleri eski checksum'lara geri cevrilir. Is tablosu verisi degistiyse metadata geri yazmak yerine islem oncesi snapshot kullanilir.

## Yerel Uygulama Sonucu

- Durum: `applied` ve sonraki tekrar calisma `already-reconciled`.
- Otomatik backup ve izole restore provasi: basarili.
- Schema fingerprint: `6d1bbb9a4d489c7152d6c3e136f0ebc069067fb92464eb47280501ec6b5ac303`.
- Is tablosu sayimlari islem oncesi/sonrasi ayni: User 4, Company 4, Product 1384, StockItem 1384, Order 0, OrderItem 0, AuditLog 154.
- `npm run prisma:migrate:verify`: 32/32, sorun yok.
- Prisma migration diff: `No difference detected`.
