# Faz 5 - Katalog Yazma Butunlugu

Durum: Siradaki P1 kod paketi.

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

Mevcut 1.379 urun kaydinin buyuk bolumunde medya bulunmadigi icin aktif medya bu P1 paketinde zorunlu yayin kapisi yapilmaz. Urunler gercek fiyat ve stokla siparis edilebilir; medya eksigi yayin hazirligi ekraninda ayri kalite uyarisi olarak gosterilir. UI/gorsel uretim fazinda urun medyalari ayrica ele alinir.

## Cikis Kriterleri

1. Tier-only, stale fiyat ve stale stok senaryolari yayinlanamaz.
2. Tekil ve toplu yayin ayni domain sozlesmesini kullanir.
3. Admin import hata enjeksiyonunda tam rollback kanitlanir.
4. Iskonto snapshot testi `unitPrice`, `lineTotal` ve fiyat kaynagini dogrular.
5. Tam test, lint, TypeScript, build ve authenticated smoke basarilidir.
