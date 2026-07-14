# Production Media Storage Runbook

## Amac

CMS banner ve urun medyasini deployment dosya sisteminden bagimsiz, kalici ve geri alinabilir tutmak.

## Secenek A - Kalici Lokal Volume

Tek instance kurulum icindir:

```env
MEDIA_STORAGE_PROVIDER="LOCAL"
```

- Uygulamanin `<app-root>/storage/media` yolu container veya sunucu yeniden baslatmalarinda korunan volume'a baglanmalidir.
- Uygulama kullanicisi dizinde okuma/yazma yetkisine sahip olmalidir.
- Volume ayri yedekleme politikasina dahil edilmelidir.
- Birden fazla instance ayni paylasimli volume'u kullanmiyorsa bu mod kullanilmaz.

## Secenek B - S3 veya Cloudflare R2

```env
MEDIA_STORAGE_PROVIDER="S3"
MEDIA_S3_BUCKET="ekolglass-media"
MEDIA_S3_REGION="auto"
MEDIA_S3_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
MEDIA_S3_ACCESS_KEY_ID="..."
MEDIA_S3_SECRET_ACCESS_KEY="..."
MEDIA_S3_FORCE_PATH_STYLE="false"
MEDIA_S3_PREFIX="portal/media"
```

- AWS S3 kullaniminda endpoint bos birakilabilir ve gercek region yazilir.
- Instance role/workload identity kullaniliyorsa access key ve secret key birlikte bos birakilir.
- Statik anahtar kullaniliyorsa ikisi birlikte secret manager uzerinden verilir.
- Bucket private kalabilir; medya uygulamanin `/media/[file]` route'u uzerinden sunulur.
- Bucket versioning, lifecycle ve backup politikasi provider tarafinda acilmalidir.

## Deployment Kontrolu

1. `/api/health` yanitinda `mediaStorage=ok` ve beklenen `mediaStorageProvider` gorulur.
2. Admin CMS ekranindan test JPEG/PNG/WebP yuklenir.
3. Donen `/media/[file]` URL'si `Content-Type`, `Cache-Control` ve `X-Content-Type-Options: nosniff` basliklariyla acilir.
4. Uygulama yeniden baslatilir ve ayni URL tekrar okunur.
5. Farkli provider'a gecis yapilacaksa eski nesneler once tasinir; DB `storageProvider` degeri plansiz toplu degistirilmez.
6. Lokal provider'da `npm run media:reconcile` ile aktif eksik nesne ve orphan dosya raporu incelenir.
