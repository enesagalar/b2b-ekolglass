# Faz 7.3 - Butunluk ve UX Kapanisi

Durum: Devam ediyor
Baslangic: 2026-07-29

Bu belge Faz 7 icinde kalan yerel isleri tek siraya koyar. Faz 8 ancak hosting,
SMTP, kalici storage, scheduler ve canli alarm girdileri hazir oldugunda acilir.
City Lojistik, ERP ve urun gorsel otomasyonu Faz 9'da kalir.

## Paket A - Tekliften Siparise Ticari Butunluk

Durum: Uygulandi; lint, typecheck, 19 Node, 448 Vitest, 41 migration, release
demo, production build ve 52 authenticated smoke kapisi gecti.

- Teklif donusumunu checkout kredi/vade/risk kuralina bagla.
- Ortak checkout kilidiyle eszamanli risk hesabini sirala.
- Siparise ticari snapshot'lari ve dogru ilk durumu yaz.
- Tuketicisi olmayan outbox olayini kaldir.
- EUR, limitsiz TRY, limitli TRY, replay ve stok rezervasyonunu test et.

## Paket B - Dependency ve CI Guvenlik Kapisi

Durum: Siradaki.

- ExcelJS -> brace-expansion advisory zincirini API uyumunu bozmadan kaldir.
- Prisma -> valibot advisory zincirini generate/migrate testleriyle kapat.
- `npm audit --omit=dev --audit-level=high` ve guncel `main` CI'yi yesile getir.
- Yeni release artifact, SBOM/provenance ve attestation kanitini kaydet.
- GitHub `main` branch protection ve zorunlu CI kontrolunu etkinlestir.

## Paket C - Aktarim Butunlugu ve Operasyonel UX

Durum: Bekliyor.

- Fiyat/stok onizlemesinde fiyat ve stok surumlerini snapshot al.
- Uygulama aninda stale satiri fail-closed reddet; baska yoneticinin yeni
  verisini eski CSV ile ezme.
- Preview/cancel mutation ve audit yazimlarini ayni transaction'a al.
- Fiyat ve fiyat/stok aktarim detaylarini mobil kayit + masaustu tablo olarak
  duzenle.
- Uygula, iptal ve geri alma formlarinda pending/cift tik kilidi kullan.

## Paket D - Kalan UX ve Yerel Release Kabulu

Durum: Bekliyor.

- Urun, firma, bayi basvurusu, stok hareketi ve aktarim listelerindeki yogun
  tablolari 360/390/768/1024 px amaca ozel kayitlara donustur.
- Urun detay sorgularini aktif sekmeye gore daralt; katalog gorsellerini
  `next/image` ile optimize et.
- Turkce operasyon dili, erisilebilir adlar, pasif sayfalama ve klavye/focus
  kabulunu tamamla.
- Lint, typecheck, Node, tam Vitest, migration, recovery, release demo,
  production build ve authenticated smoke kapilarini tek guncel checkpoint'te
  kaydet.

## Faz 8 Gecis Kurali

Paket A-D yerelde yesil olmadan Faz 8 acilmaz. Faz 8 icin ayrica production
host, DNS/TLS, kalici tek-instance database volume, SMTP, S3/R2, offsite
backup, scheduler ve alarm receiver kaniti gerekir.
