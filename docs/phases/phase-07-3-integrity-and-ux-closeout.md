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

Durum: Kod, CI ve release artifact kapisi tamamlandi; branch protection
repository ayari dogrulamasi bekleniyor.

- ExcelJS -> brace-expansion runtime zinciri dar kapsamli `.xlsx` paketlerine
  gecilerek kaldirildi.
- Prisma -> valibot zinciri 7.9.1 generate/migrate kabuluyle kapatildi.
- `npm audit --omit=dev --audit-level=high` 0 bulgu ile geciyor.
- Tam agacta Next lint pluginlerinin desteklemedigi ESLint 10'a zorla gecmeden,
  dev-only 9 high bulgu acik takip borcu olarak kaydedildi.
- Commit `79fc40a` icin GitHub Actions `30438583188` kalite ve release artifact
  isleri gecti; immutable manifest, SBOM/provenance ve attestation hatti
  calisti.
- GitHub `main` branch protection ve zorunlu CI kontrolunu etkinlestir.

## Paket C - Aktarim Butunlugu ve Operasyonel UX

Durum: Yerelde tamamlandi.

- Fiyat/stok onizlemesinde fiyat ve stok surumleri snapshot aliniyor.
- Stale fiyat veya stok tum batch'i fail-closed reddediyor.
- Preview/cancel mutation ve audit yazimlari ayni transaction'da.
- Fiyat ve fiyat/stok aktarim detaylari mobil kayit + masaustu tablo olarak
  duzenlendi.
- Uygula, iptal ve geri alma formlarinda pending/cift tik kilidi kullaniliyor.

## Paket D - Kalan UX ve Yerel Release Kabulu

Durum: Devam ediyor; firma ve bayi basvurusu liste paketi tamamlandi.

- Firma ve bayi basvurusu listeleri 1024 px altinda amaca ozel kayitlara,
  masaustunde yogun tabloya donusturuldu.
- Bu iki listede gecersiz yuksek sayfa numarasi son sayfaya cekildi; pasif
  onceki/sonraki kontrolleri tiklanabilir baglanti olmaktan cikarildi.
- Paket parcasi lint, typecheck, 19 Node, 452 Vitest, 42 migration, 0
  production audit, production build, 52 authenticated smoke ve 390/1440 px
  browser kabulunden gecti.
- Commit `0d379be` icin GitHub Actions `30697297769` kalite ve immutable
  release artifact islerini basariyla tamamladi.
- Urun ve stok hareketi listelerinde kalan yogun mobil tablo/aksiyon
  noktalarini 360/390/768/1024 px kabulunden gecir.
- Urun detay sorgularini aktif sekmeye gore daralt; katalog gorsellerini
  `next/image` ile optimize et.
- Kalan ekranlarda Turkce operasyon dili, erisilebilir adlar, pasif sayfalama
  ve klavye/focus kabulunu tamamla.
- Lint, typecheck, Node, tam Vitest, migration, recovery, release demo,
  production build ve authenticated smoke kapilarini tek guncel checkpoint'te
  kaydet.

## Faz 8 Gecis Kurali

Paket A-D yerelde yesil olmadan Faz 8 acilmaz. Faz 8 icin ayrica production
host, DNS/TLS, kalici tek-instance database volume, SMTP, S3/R2, offsite
backup, scheduler ve alarm receiver kaniti gerekir.
