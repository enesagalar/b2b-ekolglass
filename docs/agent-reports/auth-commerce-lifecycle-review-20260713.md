# Auth, Commerce ve Bayi Kullanici Yasam Dongusu Incelemesi

Tarih: 2026-07-13

## Inceleme Kollari

1. Admin/bayi public kimlik, giris yonlendirmesi ve fiyat sizintisi analizi.
2. Admin firma kullanicisi yasam dongusu ve least-privilege permission analizi.
3. Auth/ticaret rotalari icin bagimsiz regresyon testi uygulamasi.

## Uygulanan Sonuclar

- Public kimlik `guest`, `dealer`, `admin` olarak ayrildi.
- Onayli bayi disindaki roller public katalogda guest fiyat kapsaminda tutuldu.
- Bayi girisi ana sayfaya sabitlendi; admin girisi yalnizca `/admin` altinda `next` kabul ediyor.
- Admin kullanici yonetimi `company.user.manage` ve credential islemleri `company.user.credentials.manage` olarak ayrildi.
- Firma kullanicisi hard delete edilmedi; askilama tum session ve acik tokenlari transaction icinde iptal ediyor.
- Aktivasyon ve parola sifirlama tokenlari ayri modellerde, hashlenmis ve tek kullanimlik saklaniyor.
- Eski bayi ticaret rotalari kalici redirect ile ortak commerce rotalarina tasindi.

## Sonraki Inceleme Kapisi

Siparis sepeti uygulanirken stok rezervasyonu, idempotency, adres sahipligi, server-side fiyat snapshot'i ve cross-company erisim ayni transaction sinirinda test edilmelidir.
