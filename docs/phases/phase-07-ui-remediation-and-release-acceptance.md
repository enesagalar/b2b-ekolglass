# Faz 7 - UI Remediation and Release Acceptance

Status: In progress; local integrity, dependency and secondary-route UX gates remain
Started: 2026-07-24

## 2026-07-29 - Tekliften siparise ticari butunluk

- Onayli teklif donusumu normal sepet checkout'u ile ayni kredi politikasi,
  limit, acik risk ve para birimi kurallarini kullanir.
- Vade, politika, limit ve risk degerleri sipariste snapshot olarak saklanir.
- Ticari inceleme gereken siparis `WAITING_FOR_APPROVAL`, yalniz limitsiz TRY
  hesap `SUBMITTED` durumunda baslar.
- Teklif donusumu ve sepet checkout'u ayni `order-checkout` kilidiyle
  eszamanli risk hesaplamasini siralar.
- Tuketicisi olmayan teklif-donusum outbox olayi kaldirildi. Siparis e-posta
  olayi ilk durum snapshot'ini tasir.
- Hedef kabul: typecheck ve 4 kritik entegrasyon dosyasinda 13/13 test; ek
  limitli TRY senaryosuyla teklif donusumu 5/5 test.

## 2026-07-28 - Admin teklif arsivi UX

- Yeni B2B teklif olusturma kanali kapali kalir; standart urunler dogrudan
  siparis akisindan ilerler.
- Admin teklif listesi aktif talep kuyrugu yerine gecmis fiyat, karar ve
  siparis donusum izini koruyan `Teklif arsivi` olarak yeniden konumlandi.
- Gecmisten kalan acik kayitlar, teklif/karar kayitlari, siparise donusenler ve
  kapananlar ayri arsiv gruplarinda gosterilir.
- Kesin durum filtresi yalniz secili grubun durumlarini sunar; sahte veya
  uyumsuz `view + status` birlesimi veri katmaninda fail-closed kesistirilir.
- Arama teklif, firma, talep sahibi ve donusen siparis numarasini kapsar.
  Sayaclar ayni arama baglamindan hesaplanir ve yuksek sayfa numarasi gercek
  son sayfaya cekilir.
- Arsiv listesindeki fiyat alanlari `price.read` izni olmadan sorgulanmaz veya
  gosterilmez.
- Bayi arsivi salt okunur kalir. Admin yalniz gecmisten kalan acik kayitlari
  mevcut yetki ve state machine ile sonuclandirabilir; yeni teklif uretemez.
- 1024 px ve altinda mobil arsiv kaydi, 1440 px'de yogun masaustu tablosu
  kullanilir.
- Kabul: lint, typecheck, 19 Node, 446 Vitest, 52 authenticated smoke,
  production build ve 360/390/768/1024/1440 px browser QA basarili.

## 2026-07-28 - Admin siparis is kuyrugu UX

- Admin siparisleri inceleme, bekletme, hazirlik, sevke hazir, yolda ve
  tamamlanan is kuyruklarina ayrildi.
- `ON_HOLD` ayri engel kuyrugunda tutulur; kuyruk secimi durum gecisi yetkisi
  vermez ve server state machine degistirilmez.
- Kuyruk sayaclari arama ve manuel City filtresiyle ayni veri baglamindan
  hesaplanir.
- Uyumsuz `view + status` birlesimi fail-closed kesistirilir; `DRAFT`
  operasyon listesinden dislanir ve sayfa numarasi gercek araliga cekilir.
- 1024 px ve altinda amaca ozel mobil kayit, 1440 px'de yogun tablo kullanilir.
- Kabul: lint, typecheck, 19 Node, 441 Vitest, 52 authenticated smoke, 41
  migration integrity, production build ve 360/390/768/1024/1440 px browser
  QA basarili.

## 2026-07-28 - Bayi siparis ve sevkiyat operasyon UX

- Siparisler teknik durum filtresi yerine sayili operasyon gruplariyla
  gezilir.
- Arama siparis numarasi ve sevkiyat takip numarasini company tenant siniri
  icinde birlikte destekler.
- Liste ve detay ayni domain sozlesmesinden mevcut durum ve sonraki adim
  metnini uretir.
- Tarih filtresi Istanbul gun sinirlarini kullanir ve gecersiz araligi acikca
  bildirir.
- Mobil sekmeler gorunur scrollbar olmadan kaydirilir; ozet metinleri dar
  ekranda kesilmez.
- Kabul: lint, typecheck, 19 Node, 436 Vitest, 52 authenticated smoke, 41
  migration integrity, production build ve 360/390/768/1024/1440 px browser
  QA basarili.

## 2026-07-27 - Entegrasyon ve CMS operasyon UX

- Entegrasyon sayfasi teknik metriklerden once tek birincil kullanici
  gorevini ve operasyon etkisini gosterir.
- Manuel City Lojistik isi ilgili siparislere filtreli erisim saglar.
- Entegrasyon olaylari mobil kartlar, masaustunde tablo kullanir; ham kimlikler
  kapali teknik ayrintida kalir.
- Tekrar deneme formu neden, yetki ve mukerrer teslimat riskini aciklar.
- CMS ana sayfa banneri kayitli canli onizleme, ayri metin kayitlari ve
  bilgisayardan gorsel secme/yayinlama akisi kullanir.
- Secilen gorsel dosya adi, boyutu ve merkez kirpma onizlemesiyle yayin oncesi
  kontrol edilir; ag hatasi bekleme durumunu kilitlemez.
- Teknik CMS kayitlari varsayilan olarak kapali salt okunur envanterdir.
- Kabul: lint, typecheck, 19 Node, 397 Vitest, production build, 49
  authenticated smoke ve 390/1440 px browser QA basarili.

## 2026-07-27 - Firma ve bayi basvurusu gorev odakli UX

- Firma detayinda erisim, kullanici ve ticari politika ozetleri ile kayit
  durumuna gore tek onerilen aksiyon bulunur.
- Bayi basvuru karar formu server state machine ile ayni gecis sozlesmesini
  kullanir ve secilen kararin etkisini kaydetmeden once aciklar.
- Onaylanmis basvuru karar formu kilitlenir; sonraki aktivasyon/ticari kosul
  gorevi firma hesabina tasinir.
- Davetli kullanici durum islemi hedef durumla uyumlu tek aksiyon, etki onayi,
  pending ve sonuc geri bildirimi kullanir.
- Mobil gorev sirasi `bilgi -> karar -> gecmis` olarak sabitlenmistir.
- Kabul: lint, typecheck, 19 Node, 393 Vitest, production build, 47 authenticated
  smoke ve 390/1440 px browser QA basarili.

## Objective

Close the visual, navigation, perceived-performance and end-to-end release gaps discovered after Faz 6. Business rules, authorization, tenant isolation, pricing and stock semantics remain unchanged.

## Package 1 - Brand and Navigation Remediation

- Replace the cropped JPEG/ICO brand path with vector assets derived from the approved logo PDF.
- Use one glass material language for commerce navigation, portal top bars and mobile drawers.
- Keep operational content on calm solid surfaces.
- Fix exact active-route selection for nested admin routes.
- Replace uncontrolled mobile menus with an accessible drawer supporting backdrop close, Escape, focus containment, focus return and body scroll lock.
- Use the full sidebar only at `xl`; use the drawer at 1024 px.

Status: Implemented and locally accepted.

## Package 2 - Commerce and Dealer Presence

- Optimize the CMS hero through `next/image` instead of a raw CSS background transfer.
- Strengthen the dealer overview with a commercial command band, integrated KPIs and account context.
- Retain the B2B sales focus; do not add corporate-site pages.
- Continue removing nested-card patterns from high-use catalog, price, order and stock routes.

Status: Core surfaces implemented; dense secondary-route cleanup remains.

## Package 3 - Repeatable Release Demo

- Add an isolated integration scenario covering:
  - dealer cart and server-derived price snapshot,
  - order submission,
  - stock reservation without premature physical decrement,
  - approval, preparation, production and shipment lifecycle,
  - physical stock decrement at shipment,
  - no second decrement at delivery,
  - reservation consumption,
  - history, audit and append-only stock movements,
  - outbox processing and eight transactional email messages.

Command:

```powershell
npm run demo:release
```

Status: Implemented and passing locally.

## Package 4 - Release Gates

- Responsive browser checks at 360, 390, 768, 1024 and 1440 px.
- Keyboard, focus, Escape, drawer and horizontal-overflow checks.
- Full lint, typecheck, Node tests, Vitest suite and production build.
- Authenticated staging smoke against an isolated database.
- Production SMTP inbox proof.
- Hosting, DNS/TLS, persistent database/media, scheduler, backup/restore and monitoring evidence.

Status: Local quality gates passed. External production acceptance is blocked by environment and credential inputs.

Local evidence:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Node tests: 19/19 passed.
- Vitest: 84 files, 380/380 tests passed.
- `npm run demo:release`: 1/1 lifecycle scenario passed.
- Authenticated isolated smoke: 44/44 checks passed.
- `npm run build`: passed on Next.js 16.2.11.
- `npm audit --omit=dev --audit-level=high`: 2026-07-29 itibariyla artik
  gecmiyor; ExcelJS -> brace-expansion zincirinde 9 high ve Prisma ->
  valibot zincirinde 3 moderate bulgu var. Uyumlu dependency cozumunden sonra
  yerel ve CI kabul yeniden alinacak.

## External Inputs Required for GO

- Final portal hostname and target hosting platform.
- Verified SMTP account and sender domain with SPF, DKIM and DMARC.
- Persistent SQLite volume or approved database target.
- S3/R2 media bucket and separate offsite backup destination.
- Scheduler and alert receiver configuration.
- City Lojistik remains disabled until the official API contract and test account arrive.

## Acceptance Rule

Faz 7 cannot be marked complete from screenshots alone. The local quality gate, isolated lifecycle demo, authenticated staging smoke and external production evidence must all be recorded.
