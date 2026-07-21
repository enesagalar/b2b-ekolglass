# Faz 5 - Firma Erisim Yasam Dongusu

Durum: Tamamlandi.

## Amac

Bir bayi firmasinin erisimini kullanicilari tek tek degistirmeden, veri ve siparis gecmisini silmeden merkezi olarak kapatip yeniden acabilmek.

## Is Kurallari

- Yalniz `APPROVED -> SUSPENDED` ve `SUSPENDED -> APPROVED` gecisleri kabul edilir.
- Her geciste 10-500 karakterlik operator gerekcesi zorunludur.
- Form mevcut durum ve `updatedAt` surumunu tasir; stale, yinelenen ve ABA gecisleri transaction icinde reddedilir.
- Firma askisinda tum bayi session kayitlari silinir.
- Acik aktivasyon ve parola sifirlama tokenlari iptal edilir.
- Kullanici durumlari degistirilmez; boylece firma yeniden acildiginda yalniz daha once aktif olan hesaplar giris yapabilir.
- Siparis, teklif arsivi, stok rezervasyonu ve audit gecmisi silinmez.
- Her gecis aktor, onceki/yeni durum, gerekce ve iptal sayimlariyla audit log'a yazilir.

## Yetki Ve Guvenlik

- Server action yalniz `SUPER_ADMIN` ve `ADMIN` rollerindeki `company.lifecycle.manage` iznini kabul eder.
- Satis yoneticisi firma ticari kosullarini yonetebilir ancak firma genelinde credential iptali yapamaz.
- Bayi portali merkezi dealer context uzerinden yalniz `APPROVED` firmalari kabul eder.
- Beklenmeyen altyapi hatalari kullaniciya ham exception olarak donmez.
- Askilama, firma durumu ve credential iptallerini tek transaction icinde tamamlar.

## Kabul Kaniti

- SQLite entegrasyon testi askilama, session iptali, token iptali, audit, stale komut ve yeniden etkinlestirmeyi kapsar.
- Admin firma detayinda mevcut duruma gore askilama veya yeniden acma formu gosterilir.
- Authenticated smoke firma yasam dongusu kontrolunun render edildigini dogrular.

## Sonraki Faz

P1 katalog yazma butunlugu: `docs/phases/phase-05-catalog-write-integrity.md`.
