# Faz 5 - Katalog Yazma Butunlugu

Durum: Tamamlandi (2026-07-21).

## Problem

- Tekil urun yayinlama readiness verisini transaction disinda okudugu icin fiyat veya stok arada degisirse stale sonuc ile urun yayinlanabilir.
- Yayin kapisi herhangi bir aktif genel fiyat satirini yeterli sayar; yalniz `minQuantity > 1` kademesi olan urun 1 adet siparis edilemedigi halde hazir gorunebilir.
- Admin urun CSV importu kategori, urun, stok ve audit yazimlarini tek transaction'da tamamlamadigi icin ara asama hatasinda kismi veri birakabilir.

## Hedef

- Tekil ve toplu yayin komutlari ortak transactional readiness servisini kullanir.
- Yayin icin aktif donemde, genel kapsamli, pozitif tutarli ve `minQuantity=1` fiyat satiri zorunludur.
- Stok uygunlugu transaction icinde yeniden okunur; stale fiyat/stokta hicbir yayin ve audit yazimi kalmaz.
- Admin urun CSV importu kategori, create/update, ilk stok ve audit adimlarini tek atomik islem olarak tamamlar.
- Import veya audit adimindaki hata tum katalog degisikliklerini rollback eder.
- Firma iskontolu genel bayi fiyatinin checkout snapshot'ina yansimasi SQLite entegrasyon testiyle kanitlanir.

## Medya Karari

Mevcut 1.379 urun kaydinin buyuk bolumunde medya bulunmadigi icin aktif medya bu P1 paketinde zorunlu yayin kapisi yapilmaz. Urunler gercek fiyat ve stokla siparis edilebilir; medya eksigi UI/gorsel uretim fazinda ayri katalog kalite uyarisi olarak ele alinacaktir.

## Cikis Kriterleri

1. Tier-only, stale fiyat ve stale stok senaryolari yayinlanamaz.
2. Tekil ve toplu yayin ayni domain sozlesmesini kullanir.
3. Admin import hata enjeksiyonunda tam rollback kanitlanir.
4. Iskonto snapshot testi `unitPrice`, `lineTotal` ve fiyat kaynagini dogrular.
5. Tam test, lint, TypeScript, build ve authenticated smoke basarilidir.

## Tamamlanan Uygulama

- Tekil yayin komutunda urun, fiyat ve stok readiness okumasi; kosullu durum guncellemesi ve audit ayni transaction icine alindi.
- Tekil ve toplu yayin ayni domain readiness sozlesmesiyle yalniz aktif donemdeki genel, pozitif ve `minQuantity=1` fiyat satirini kabul ediyor.
- Tekil gecisler `DRAFT -> ACTIVE` ve `ACTIVE -> DRAFT` ile sinirlandi; stale durum kosullu guncelleme ile reddediliyor.
- Admin urun CSV importunda kategori upsert, urun create/update, ilk `MERKEZ` stogu ve audit tek 60 saniyelik transaction icinde tamamlaniyor.
- SQLite trigger hata enjeksiyonu ile toplu yayin ve urun importunda audit hatasinin tum yazilari rollback ettigi kanitlandi.
- Firma iskontosunun standart bayi fiyatindan hesaplanip siparis kalemine `COMPANY_DISCOUNT`, `unitPrice` ve `lineTotal` olarak snapshotlandigi entegrasyon testi eklendi.
- Beklenmeyen Prisma/SQLite hata ayrintilari yayin ve import yanitlarinda kullaniciya aktarilmiyor.
- 73 Vitest dosyasinda 346 test, 9 Node testi, lint, TypeScript, high audit kapisi, production build ve 43 adimli authenticated smoke basarili.

Medya eksigi bu fazda yayin engeli degildir; sonraki UI/urun icerigi calismasinda kalite uyarisi olarak ele alinacaktir.
