# Faz 5 - Satis ve Siparis Raporlamasi

## Durum

Tamamlandi.

## Metrik Sozlesmesi

- Bu ekran muhasebe cirosu, fatura, tahsilat, kar veya marj raporu degildir.
- Siparis degeri `Order.subtotal` snapshot'idir; guncel urun fiyatindan yeniden hesaplanmaz.
- Gun sinirlari production sunucusunun saat diliminden bagimsiz olarak `Europe/Istanbul` kabul edilir.
- TRY, EUR ve USD tutarlari birbirine eklenmez; her rapor tek para birimiyle calisir.
- Guncel net siparis degeri, secilen donemde gonderilen ve bugun iptal olmayan siparisleri kapsar.
- Iptal etkisi, `OrderStatusHistory` icindeki gercek `CANCELLED` gecisinin donemine yazilir.
- Teslim edilen deger icin hem siparis hem sevkiyat `DELIVERED` olmali ve `Shipment.deliveredAt` doneme girmelidir.
- Ticari inceleme, onay bekleyen siparisleri ve bu asamalardan beklemeye alinmis `ON_HOLD` siparisleri kapsar.

## UX Ve Erisilebilirlik

- Yedi, otuz ve doksan gun hazir filtreleri ile en fazla 366 gunluk ozel aralik vardir.
- Uzun donem grafikleri haftalik veya otuz gunluk gruplara sikistirilir; kaynak gun serisi sifir gunlerle kesintisizdir.
- Grafik klavye odagi, acik etiket ve ekran okuyucu veri tablosu sunar.
- Rota loading skeleton ve filtreleri koruyan hata/yeniden deneme sinirina sahiptir.
- Firma tablosu net siparis degerine gore ilk on firmayi gosterir ve firma operasyon ekranina baglanir.

## Yetki Ve Performans

- Rota ve admin navigasyonu `report.read` iznine tabidir.
- Bu izni alan mevcut roller ayni zamanda `price.read` iznine sahiptir; bayi rolleri rapora erisemez.
- Order, Shipment ve OrderStatusHistory donem sorgulari migration indeksleriyle desteklenir.
- Para toplamlari Prisma Decimal ile yapilir; JavaScript kayan nokta toplami kullanilmaz.

## Kabul Kaniti

- Istanbul gun siniri, gecersiz tarih, para birimi ve en fazla donem kurallari domain testleriyle dogrulanir.
- Entegrasyon testi para birimi izolasyonu, donem iptali, teslim tutarliligi, beklemeye alinmis ticari inceleme ve firma siralamasini kapsar.
- Authenticated admin smoke testi `/admin/raporlar` rotasini ve navigasyonunu dogrular.
- Tam lint, test paketi, production build ve responsive browser QA release kapisidir.

## Sonraki Dilim

- `stock.read.detailed` izniyle anlik stok operasyon raporu.
- Ekran sorgusuyla ayni veri setini kullanan UTF-8 CSV disari aktarimi.
- Fatura/tahsilat modeli eklendiginde ayri bir muhasebe raporlama fazi.
