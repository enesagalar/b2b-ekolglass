# Dealer Dashboard UX Agent Review - 2026-07-11

## Kullanici Sorulari

- Hangi siparis veya teklif aksiyon bekliyor?
- Sevkiyat nerede?
- Hangi ticari kosullar gecerli?
- Katalog ve yeni talep akisina en kisa nasil gidilir?

## Uygulanan Kararlar

- Admin ekraninin kopyasi yerine firma operasyon odakli bayi shell kullanildi.
- Dashboard gercek order, quote, shipment ve product sorgularindan besleniyor.
- Sifir veride hardcoded ornek kayit yerine yonlendirici empty state var.
- Teklif tutari modelde olmadigi icin uydurulmuyor.
- Cari bakiye modeli olmadigi icin acik siparis toplami cari kullanim gibi sunulmuyor.
- Mobil siparis/teklif listeleri tablo yerine kompakt kayit satiri kullaniyor.

## Takip Borcu

- Authenticated katalog dealer shell icinde kalmali.
- Liste sayfalama ve company-scoped detay rotalari eklenmeli.
- Gercek ERP finansal snapshot olmadan bakiye/kullanilabilir limit gosterilmemeli.
- City Lojistik dogrulanmadan sahte tracking state uretilmemeli.
