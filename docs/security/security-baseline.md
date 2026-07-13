# Security Baseline

Bu proje B2B bayi, fiyat, siparis ve stok verisi tasiyacagi icin security islemleri faz kapisi olarak ele alinir.

## Mevcut Uygulananlar

- Admin route guard.
- DB backed session.
- HttpOnly session cookie.
- Password hashleme.
- Login failure audit log.
- Basit login throttling.
- Kritik admin mutation action'larinda `requireAdminUser`.
- CMS ve katalog mutation action'larinda audit log.
- Production seed'de varsayilan admin sifresi engeli.
- `.env.example` repoya dahil, `.env` dosyalari ignore.

## Kisa Vadeli Eksikler

- Production transactional e-posta ile aktivasyon/parola sifirlama teslimi.
- Kalici ve IP+hesap anahtarli rate limit depolamasi.
- CSRF stratejisi netlestirme.
- Auth/session unit ve entegrasyon testleri.
- Permission bazli action guard:
  - `product.manage`
  - `price.manage`
  - `stock.manage`
  - `dealer.application.review`
- Dealer/company veri izolasyonu testleri.
- Audit log ekrani.
- Rate limit'in kalici ayar/konfigurasyon modeli.

## Faz Kapisi Security Checklist

Her yeni admin mutation icin:

- Server action kendi icinde auth kontrolu yapar.
- Gerekirse permission kontrolu yapar.
- Form validation server tarafinda yapilir.
- Unique/foreign key hatalari kullaniciya kontrollu mesaj olarak doner.
- Audit log yazilir.
- Public veya dealer verisi etkileniyorsa role/company izolasyonu dusunulur.
- Test veya smoke test vardir.

Her yeni public/dealer feature icin:

- Firma bazli veri sizintisi riski kontrol edilir.
- Fiyat gorunurlugu role/company/customer group bazinda kontrol edilir.
- Siparis/teklif islemleri id tahminiyle baska firmaya erisemez.

## Production Oncesi Bloklayici Maddeler

- SQLite yerine production DB karari: PostgreSQL onerilir.
- `AUTH_SECRET` guclu ve ortama ozel olmali.
- `SEED_ADMIN_PASSWORD` production'da zorunlu olmali.
- HTTPS zorunlu.
- Cookie `secure` production'da aktif.
- Backup ve migration stratejisi hazir olmali.
- Admin MFA ve kritik kullanici islemleri icin yeniden kimlik dogrulama karari tamamlanmali.
