# Faz 7.2 - Stok ve Depo Operasyonlari

Durum: Devam ediyor.

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

## Otomatik Stok Durumu Sozlesmesi

1. `quantity <= 0`: `OUT_OF_STOCK`
2. `quantity - reservedQuantity <= 0`: `RESERVED`
3. Kullanilabilir miktar `1-3`: `LOW_STOCK`
4. Kullanilabilir miktar `4+`: `IN_STOCK`

Durum bir kullanici tercihi degildir. Fiziksel ve rezerve sayaclar
degistiginde server/domain ve veritabani ayni kuralla yeniden hesaplar.

## Kalan Kapsam

1. Faz 7.2B: depolar arasi atomik transfer.
2. Faz 7.2B: iki bacakli hareket defteri, yetki, audit, idempotency ve rollback
   testleri.
3. Faz 7.2C: sayim oturumu ve gerekceli fark duzeltme hareketi.
4. Faz 7.2C: sayim yetki, audit, concurrency ve rollback testleri.

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
