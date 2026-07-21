# Faz 5 - Stok Hareket Defteri

Durum: Tamamlandi (2026-07-21).

## Problem

`StockItem` fiziksel ve rezerve guncel bakiyeyi, `StockReservation` siparis rezervasyonunu tutar. Manuel duzeltme, CSV aktarimi, rezervasyon, iptal ve sevkiyat etkilerini ortak ve sorgulanabilir bir tarihsel defterde aciklayan model henuz yoktur.

## Hedef

- Fiziksel veya rezerve bakiyeyi degistiren her production kod yolu ayni transaction icinde append-only hareket uretir.
- Her harekette urun, depo, tur, fiziksel/rezerve delta, onceki/sonraki bakiye, aktor, gerekce ve kaynak kimligi bulunur.
- Manuel duzeltme stale bakiye kontrolu ve zorunlu gerekce ister.
- CSV, siparis rezervasyonu, iptal/release ve sevkiyat tuketimi ortak hareket sozlesmesini kullanir.
- Defter ile `StockItem` bakiyesi arasindaki fark admin tarafinda kritik mutabakat uyarisi uretir.
- Admin liste ekrani urun, depo, hareket turu, kaynak ve tarih filtresi sunar.

## Kapsam Siniri

- ERP kolon eslestirmesi sonraki provider paketidir.
- City Lojistik bu fazin disindadir.
- UI redesign yapilmaz; mevcut admin tasarim sistemi kullanilir.

## Cikis Kriterleri

1. Hareket kaydi yazilamazsa bakiye degisikligi rollback olur.
2. Ayni idempotency anahtari ikinci stok etkisi uretmez.
3. Rezervasyon, iptal ve sevkiyat delta denklemleri entegrasyon testlerinde kanitlanir.
4. Append-only sinir veritabani seviyesinde korunur.
5. Tam test, lint, TypeScript, build ve authenticated smoke basarilidir.

## Tamamlanan Uygulama

- `StockMovement` fiziksel ve rezerve delta, once/sonra bakiye, urun/depo snapshot'i, aktor, gerekce, kaynak, sira ve payload hash alanlariyla eklendi.
- Hareket satirlari SQLite tetikleyicileriyle update/delete islemlerine kapatildi; sira ve bakiye zinciri insert aninda dogrulaniyor.
- Mevcut stoklar migration sirasinda acilis bakiyesiyle geriye donuk olarak deftere alindi.
- Manuel duzeltme stale `updatedAt`, zorunlu gerekce ve idempotency anahtari kullaniyor; rezerve miktarin altina fiziksel stok indirilemiyor.
- Urun paketi, seed, fiyat/stok CSV, bayi siparisi, teklif donusumu, iptal ve sevkiyat ayni transaction icinde ortak hareket sozlesmesini kullaniyor.
- `/admin/raporlar?view=stock-movements` urun/kaynak, depo, hareket, kaynak turu ve tarih filtreleriyle acildi.
- Stok raporu aktif rezervasyon defteriyle birlikte hareket toplamlarini da guncel sayaclarla karsilastiriyor ve kritik uyumsuzlugu gosteriyor.
- Rollback, idempotency, append-only, rezervasyon, release ve consume denklemleri gercek SQLite entegrasyon testleriyle kanitlandi.
- Son kalite kapisi: 35/35 migration, 74 Vitest dosyasi / 349 test, 9 Node testi, lint, TypeScript ve production build basarili.
