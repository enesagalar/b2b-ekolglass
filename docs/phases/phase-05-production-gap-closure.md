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

Durum: Tamamlandi.

- Bayi basvurusunda atomik HMAC'li IP/e-posta pencere sayaclari ve 24 saatlik duplicate claim.
- Ayni e-postadan eszamanli gonderimler tek `DealerApplication` ve tek audit kaydi uretir.
- Aktivasyon ve parola sifirlamada token, flow-IP ve iki akis toplam global IP siniri.
- Raw IP/token limiter tablolarinda veya failure audit metadata'sinda saklanmaz.
- Production'da guvenilir client IP cozulemezse token veya basvuru sorgusundan once fail-closed red.
- Expired login, security bucket ve duplicate claim kayitlari ayni maintenance transaction'inda temizlenir.
- SQLite atomik sayac, concurrent duplicate, rotating-token IP siniri, migration ve audit rollback testleri.

### Paket 3 - Ticari/CMS mutation butunlugu

Durum: Tamamlandi.

- Fiyat listesi ve urun fiyati ile audit ayni transaction'da; mevcut kayitlar `expectedUpdatedAt` CAS ile korunur.
- Urun fiyati sessiz upsert yerine acik create/update kimligi ve surumu kullanir.
- Fiyat okuma yuzeyleri `price.read` olmadan sorgu veya render yapmaz.
- CMS key allowlist, `isEditable`, kayit tipi, stale-form, no-op ve audit rollback sozlesmesi.
- CTA CMS ayari public ana sayfadaki arama aksiyonuna baglandi.
- Banner DB/audit atomikligi, UUID+checksum object key, storage telafisi ve 30 gun eski nesne retention karari.
- Firma ticari kosullarinda optimistic concurrency ve audit rollback.
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

Paket 3 kapandi. Paket 4'teki deployment artifact ve dis platform maddeleri acikca ayrildiktan sonra proje sahibine `UI degisikligine haziriz` karari sunulur.
