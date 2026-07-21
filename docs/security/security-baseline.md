# Security Baseline

Bu proje B2B bayi, fiyat, siparis ve stok verisi tasiyacagi icin security islemleri faz kapisi olarak ele alinir.

## Mevcut Uygulananlar

- Admin route guard.
- DB backed session.
- HttpOnly session cookie.
- Password hashleme.
- Login failure audit log.
- HMAC anahtarli, indeksli e-posta + guvenilir IP login rate limit modeli.
- Bilinmeyen hesaplarda dummy bcrypt karsilastirmasi.
- Forwarding header'lari icin acik proxy guven siniri ve IP dogrulamasi.
- Kritik admin ekran ve mutation action'larinda role/permission bazli fail-closed guard.
- CMS ve katalog mutation action'larinda audit log.
- Admin dashboard sorgularindan once `admin.dashboard.read` kontrolu.
- Auth session degisimi, expiry, pasif kullanici ve logout invalidation entegrasyon testleri.
- Firma kapsamli bayi siparis/teklif veri izolasyonu testleri.
- Firma askisinda tum bayi session ve acik aktivasyon/parola tokenlarini ayni transaction'da iptal eden yasam dongusu kapisi.
- Firma geneli credential iptali icin satis rollerinden ayrilmis `company.lifecycle.manage` yetkisi ve `updatedAt` optimistic concurrency korumasi.
- SameSite session cookie ve Next.js Server Action Origin/Host dogrulamasi.
- HSTS, frame deny, MIME nosniff, referrer, permissions policy ve dar CSP savunma basliklari.
- Production proxy/IP header sozlesmesi ve mutlak kalici SQLite yolu icin fail-closed preflight.
- Dependency audit'te high/critical bulgu yok; transitive moderate bulgular dokumante edilip upstream patch takibine alindi.
- Production seed'de varsayilan admin sifresi engeli.
- `.env.example` repoya dahil, `.env` dosyalari ignore.

## Kisa Vadeli Eksikler

- Production transactional e-posta ile aktivasyon/parola sifirlama teslimi.
- Audit log ekrani.
- Merkezi alarm kanali ve production scheduler kurulumu deployment ortaminda tamamlanmali.
- MFA ve kritik hesap islemlerinde yeniden kimlik dogrulama urun karari.

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

- SQLite kullanilacaksa tek writer/instance, mutlak kalici volume, izlenen backup ve restore provasi zorunlu; yatay olceklemede PostgreSQL gecisi once tamamlanmali.
- `AUTH_SECRET` guclu ve ortama ozel olmali.
- `AUTH_RATE_LIMIT_SECRET` ayri, en az 32 karakter ve placeholder olmayan bir secret olmali.
- `AUTH_TRUST_PROXY` yalniz forwarding header'ini overwrite eden dogrulanmis proxy arkasinda acilmali.
- `SEED_ADMIN_PASSWORD` production'da zorunlu olmali.
- HTTPS zorunlu.
- Tum scheduler base URL'leri public portal ile ayni temiz HTTPS origin'i kullanmali.
- Cookie `secure` production'da aktif.
- S3 backup timeout'u lease suresinden kisa olmali; backup, migration ve farkli failure-domain restore kaniti hazir olmali.
- Admin MFA ve kritik kullanici islemleri icin yeniden kimlik dogrulama karari tamamlanmali.
