# Ticari ve CMS Mutation Butunlugu

## Kapsam

Bu sozlesme fiyat listesi, urun fiyati, firma ticari kosullari, ana sayfa CMS alanlari ve banner medyasi icin production yazma sinirini tanimlar.

## Ticari Veriler

- Fiyat listesi ve urun fiyati yazimi ile audit kaydi ayni Prisma transaction'i icindedir.
- Mevcut fiyat listesi, urun fiyati ve firma ticari kosulu `expectedUpdatedAt` ile optimistic concurrency uygular.
- Stale form yazim ve audit uretmeden reddedilir.
- Urun fiyati ekleme ve guncelleme ayri semantiktedir; mevcut satir kimlik ve surum olmadan sessizce ezilmez.
- Audit gercek `ProductPrice` kimligini, onceki/yeni fiyat degerini ve fiyat kademesini kaydeder.
- Fiyat listesi audit'i onceki/yeni kapsam, tarih araligi, oncelik ve aktiflik degerlerini saklar.
- Fiyat okuma yuzeyleri `price.read`, mutation'lar `price.manage` izniyle korunur.

## CMS Ayarlari

- Duzenlenebilir anahtarlar kod icinde `homepage.hero.title`, `homepage.hero.subtitle` ve `homepage.hero.cta` ile sinirlidir.
- Kullanici girdisinden yeni `SiteSetting` olusturulmaz; `upsert` kullanilmaz.
- Kayit `group=homepage`, `valueType=TEXT` ve `isEditable=true` kosullarinin tamamini saglamalidir.
- Ayar, CAS guncellemesi ve audit tek transaction'dadir.
- Degismeyen deger audit gurultusu uretmez.
- CTA ayari public ana sayfadaki arama butonuna baglidir.

## Banner Medyasi

- Her yeni nesne UUID + SHA-256 ile bu yukleme denemesine ozel bir object key alir.
- Banner pointer'i, optimistic concurrency kontrolu ve audit ayni transaction'dadir.
- Storage yazimi sonrasi transaction basarisizsa yalniz bu denemeye ait nesne idempotent olarak silinir.
- Telafi silme hatasi correlation ID ile loglanir; storage hatasi HTTP yanitina sizmaz.
- Basarili degisimde onceki nesne hemen silinmez. Audit'teki `previousObjectKey` geri alma/inceleme bagini korur.

## Retention Karari

- Eski banner nesneleri en az 30 gun saklanir.
- `media:reconcile` salt okunurdur ve otomatik silme yapmaz.
- 30 gunu dolan orphan nesneler ancak ayrica onaylanmis cleanup isiyle, aktif DB referansi yeniden kontrol edilerek silinebilir.
- S3/R2 bucket versioning acik tutulur; non-current version lifecycle'i en az 90 gun olmalidir.
- LOCAL provider'da `storage/media` volume'u backup politikasina dahildir.

## Hata Sozlesmesi

- Beklenen validation, stale ve duzenlenemez-kayit hatalari kontrollu Turkce mesaj doner.
- Beklenmeyen altyapi hatalari sunucuda correlation ID ile loglanir.
- Kullanici yalniz genel hata ve destek kodunu gorur; Prisma, SQLite, bucket, endpoint veya credential ayrintisi donmez.
