# Faz 5 - Production Kod Bosluklarini Kapatma

## Amac

City Lojistik ve gorsel UI yenilemesini kapsam disinda tutarak production oncesi ic kod risklerini kapatmak, dis ortam kabullerini kod eksiklerinden ayirmak ve her paketi test kanitiyla tamamlamak.

## Paket Durumu

### Paket 1 - Stok durumu ve calistirma zinciri

Durum: Tamamlandi.

- Rezervasyon, teklif donusumu, iptal ve sevkiyat stok durumunu transaction icinde turetir.
- Scheduler komutlari platform process environment'i ile `.env` olmadan calisir.
- Production start preflight'i atlayamaz; CI icin ayri test baslangici vardir.
- Typecheck bagimsiz CI kapisidir.
- Ilk production yoneticisi yalniz bos `User` tablosunda, audit ile atomik ve tek seferlik olusturulur.

### Paket 2 - Public abuse ve credential deneme sinirlari

Durum: Siradaki.

- Bayi basvurusunda HMAC'li IP/e-posta rate limit ve duplicate pencere.
- Aktivasyon ve parola sifirlamada farkli tokenlarla limit asmayi engelleyen guvenilir IP anahtari.
- Raw IP saklamama, expiry indeksleri, maintenance ve regresyon testleri.

### Paket 3 - Ticari/CMS mutation butunlugu

Durum: Bekliyor.

- Fiyat listesi ve urun fiyati ile audit ayni transaction'da.
- CMS key allowlist, `isEditable`, stale-form ve audit rollback sozlesmesi.
- Banner DB/audit atomikligi, storage telafisi ve eski nesne retention karari.
- Firma ticari kosullarinda optimistic concurrency.
- Beklenmeyen altyapi hatalarinda correlation ID'li guvenli kullanici mesaji.

### Paket 4 - Deployment artifact ve son kabul

Durum: Platform karari bekliyor.

- Degismez OCI/paket artifact'i ve SHA-256 digest.
- Tek instance SQLite, kalici volume, migration-before-traffic ve rollback manifesti.
- Son tam regresyon, recovery, authenticated smoke ve GitHub CI.

## Dis Kabul Bagimliliklari

- Hosting platformu, bolge, volume ve portal subdomain karari.
- DNS, TLS ve kurumsal sitedeki `Bayi Portali` baglantisi.
- SMTP hesabi ve dogrulanmis sender domain.
- Medya S3/R2 bucket, IAM ve versioning.
- Ayri failure-domain sifreli backup bucket ve restore tatbikati.
- Scheduler, merkezi log sink, dead-man alarmi ve webhook receiver.
- Reverse proxy'nin guvenilir client-IP header overwrite kaniti.

Bu maddeler gercek ortam kaniti olmadan tamamlandi sayilmaz.

## UI Gecis Kapisi

Paket 2 ve Paket 3 kapanmadan UI yenilemesi baslamaz. Paket 4'teki dis platform maddeleri acikca ayrildiktan sonra proje sahibine `UI degisikligine haziriz` karari sunulur.
