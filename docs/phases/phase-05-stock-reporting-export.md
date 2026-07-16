# Faz 5 - Stok Operasyon Raporu ve CSV

## Durum

Tamamlandi.

## Veri Sozlesmesi

- Rapor tane seviyesi `StockItem`, yani bir urun + bir depo kaydidir.
- Varsayilan kapsam yalniz `ACTIVE` urunlerdir; taslak ve durdurulmus urunler acik filtreyle secilir.
- Fiziksel stok `quantity`, rezerve `reservedQuantity`, kullanilabilir miktar ikisinin farkidir.
- Operasyon siniflari sayaclardan turetilir: fiziksel stok yok, tamami rezerve, dusuk kullanilabilir ve kullanilabilir.
- Elle tanimlanan stok durumu operasyon sinifindan ayridir; `Stok Sorunuz` stoksuz anlamina gelmez.
- KPI, satirlar, aktif rezervasyon defteri kontrolu ve `snapshotAt` tek read transaction icinden uretilir.

## Filtre Ve UX

- Satis ve stok raporlari permission-aware sekmelerle ayrilir.
- Arama, depo, operasyon durumu, urun durumu, tanimli stok durumu ve siralama URL'de korunur.
- KPI ve tablo ayni filtrelenmis veri kumesini kullanir.
- Varsayilan siralama kullanilabilir miktar, urun kodu, depo ve kayit kimligiyle deterministiktir.
- Tablo mobilde kontrollu yatay kayar; semantik caption ve kolon basliklari vardir.
- Bos sonuc ve 5.000 satir ustu export durumunda indirme kontrolu acik gerekceyle kapanir.

## Yetki Ve Guvenlik

- Stok sekmesi `stock.read.detailed`, CSV ise ek olarak `stock.export` ister.
- `stock.export`: SUPER_ADMIN, ADMIN, SALES_MANAGER ve WAREHOUSE_STAFF.
- SALES_STAFF stok ekranini okuyabilir ancak disari aktaramaz; bayi rolleri hicbir rapora erisemez.
- Export query parametreleri allowlist ve duplicate kontrolunden gecer.
- CSV UTF-8 BOM, CRLF ve RFC 4180 quoting kullanir; formula baslaticilari ASCII ve full-width varyantlarla notrlenir.
- Dosya adi server tarafinda uretilir; cevap `no-store` ve `nosniff` basliklari tasir.
- Audit kaydi aktor, filtre, satir sayisi, snapshot zamani, dosya adi ve SHA-256 checksum saklar.
- Bilinmeyen DB hatalari istemciye sizmaz; correlation ID ile genel `500` doner.

## Veri Kalitesi

- `reservedQuantity`, ayni stok kaydinin `ACTIVE` rezervasyon toplami ile karsilastirilir.
- Uyumsuzluk KPI toplamlarindan gizlenmez ve admin ekraninda operasyon uyarisi olarak gosterilir.
- Rapor tarihsel stok hareketi degildir; hareket defteri ayri bir gelecek fazidir.

## Kabul Kaniti

- Domain testleri filtre sinirlarini, Unicode formula korumasini, BOM ve CSV quoting'i kapsar.
- Prisma entegrasyon testi dort operasyon sinifini, aktif urun kapsamını, ledger farkini ve ekran/CSV satir esligini dogrular.
- Route testleri 401/403, rol kesişimi, query allowlist, audit, header, BOM ve kontrollu `500` davranisini kapsar.
- Authenticated smoke testi stok sekmesini ve admin navigasyonunu dogrular.
- Tam lint, test, production build ve desktop/mobile browser QA release kapisidir.
