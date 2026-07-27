# Faz 7.2 - Stok ve Depo Operasyonlari

Durum: Tamamlandi.

## Tamamlanan Kapsam

- Urun ve depo bazli fiziksel, rezerve ve kullanilabilir stok raporu.
- Rezervasyon ve hareket defteri mutabakati.
- CSV stok aktarimi ve stok hareketleri baglantisi.
- Ayrik `/admin/stok` operasyon rotasi.
- Her depo satirinin kendi optimistic concurrency surumuyle guncellenmesi.
- Urun detayindaki stok satirlarina dogrudan operasyon baglantisi.
- Risk, temel stok kavramlari ve onerilen ilk aksiyonu aciklayan gorev odakli
  stok operasyon ekrani.
- Tablet ve mobilde yatay teknik tablo yerine amaca ozel stok kayitlari.
- Stok sayfalamasinin aktif operasyon rotasini koruyan regresyon testi.
- Fiziksel ve rezerve sayaclardan otomatik stok durumu turetimi.
- Urun ve stok formlarinda canli kullanilabilir miktar/durum geri bildirimi.
- Manuel stok durumu seciminin ve server tarafinda durum kabulunun kaldirilmasi.
- Mevcut kayitlari duzelten ve dogrudan DB yazimlarini koruyan SQLite
  tetikleyicileri.
- `Warehouse` ana veri modeli: kod, ad, aktiflik ve teslimat adresi.
- Mevcut stok depolarinin geriye donuk olusturulmasi ve `StockItem` depo
  baglantisinin foreign key ile korunmasi.
- Urun, stok ve toplu aktarim akislari boyunca kontrollu aktif depo secimi.
- Ayrik `/admin/stok/depolar` depo yonetim alani.
- `warehouse.manage` yetkisi, optimistic concurrency ve audit kaydi.
- Bakiyesi bulunan deponun ve sistemdeki son aktif deponun kapatilmasini
  engelleyen server kurallari.
- `StockTransfer` ana kaydi ve ayrik `/admin/stok/transferler` calisma alani.
- Kullanilabilir stoktan kaynak azalis ve hedef artis yapan atomik transfer.
- Transferi kaynak/hedef stok satirlari ve iki hareket bacagina baglayan
  foreign key sozlesmesi.
- `TRANSFER_OUT` ve `TRANSFER_IN` append-only hareketleri.
- Aktor/payload bagimli idempotency, optimistic CAS, audit ve tam rollback.
- Tamamlanmis transfer kayitlarini degisiklik ve silmeye kapatan SQLite
  tetikleyicileri.
- Tum stok yazicilarinin ortak `stock-mutations` kilit sirasina alinmasi.
- `StockCountSession` ile urun/depo bazli fiziksel sayim oturumu.
- Acilis aninda fiziksel, rezerve, stok surumu ve son hareket sirasinin
  degistirilemez snapshot olarak saklanmasi.
- Ayni stok satirinda yalniz bir acik sayima izin veren SQLite partial unique
  index.
- Pozitif, negatif ve sifir farki `INVENTORY_COUNT` hareketine baglayan atomik
  sayim sonucu.
- Rezerve miktari asagi cekmeyen ve eski bakiyeyi ezmeyen `STALE` inceleme
  kaydi.
- Sayim acma, uygulama ve iptal komutlarinda aktor/payload bagimli
  idempotency, audit ve ortak stok kilidi.
- Uygulanan, inceleme gereken ve iptal edilen terminal sayim kayitlarini
  degisiklik/silmeye kapatan SQLite tetikleyicileri.
- Ayrik `/admin/stok/sayimlar` mobil ve masaustu operasyon alani.

## Otomatik Stok Durumu Sozlesmesi

1. `quantity <= 0`: `OUT_OF_STOCK`
2. `quantity - reservedQuantity <= 0`: `RESERVED`
3. Kullanilabilir miktar `1-3`: `LOW_STOCK`
4. Kullanilabilir miktar `4+`: `IN_STOCK`

Durum bir kullanici tercihi degildir. Fiziksel ve rezerve sayaclar
degistiginde server/domain ve veritabani ayni kuralla yeniden hesaplar.

## Kalan Kapsam

Portal ici Faz 7.2 kapsami tamamlandi. Gercek iOS Safari ve Android Chrome
cihaz kabulu yayin oncesi harici kabul kapisidir.

ERP stok senkronizasyonu bu fazin parcasi degildir. Once portal icindeki stok
operasyonu deterministik hale getirilecek, ERP sonraki entegrasyon katmani
olacaktir.

## Faz 7.2A Kabul Kaniti

- Yerel veritabaninda 39 migration, 1.384 stok satiri, sifir bilinmeyen depo
  baglantisi ve temiz `foreign_key_check`.
- 19/19 Node testi ve 407/407 Vitest testi.
- 50 authenticated admin smoke kontrolu.
- Lint, typecheck ve production build basarili.
- 390 px mobil ve 1280 px masaustu browser kontrolunde yatay tasma veya console
  hatasi yok.

## Faz 7.2B Kabul Kaniti

- Yerel veritabaninda 40 migration ve temiz migration integrity kontrolu.
- Gercek SQLite testlerinde basarili transfer, guvenli replay, farkli payload
  catisma, yetersiz kullanilabilir stok, ikinci hareket bacaginda tam rollback,
  append-only koruma ve eszamanli transfer yarisi dogrulandi.
- 19/19 Node testi ve 418/418 Vitest testi.
- 51 authenticated admin smoke kontrolu.
- Lint, typecheck ve production build basarili.
- 390 px mobil ve 1280 px masaustu browser kontrolunde yatay tasma veya console
  hatasi yok.

## Faz 7.2C Kabul Kaniti

- Yerel veritabaninda 41 migration ve temiz migration integrity kontrolu.
- Gercek SQLite testlerinde snapshot/replay, pozitif ve sifir fark, rezervasyon
  korumasi, stale sonuc, iptal, terminal kayit korumasi ve eszamanli sonuc
  yarisi dogrulandi.
- 19/19 Node testi ve 431/431 Vitest testi.
- 52 authenticated admin smoke kontrolu.
- Lint, typecheck ve production build basarili.
- 390 px mobil ve 1280 px masaustu browser kontrolunde yatay tasma veya console
  hatasi yok.
