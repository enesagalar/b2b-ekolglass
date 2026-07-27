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

## Otomatik Stok Durumu Sozlesmesi

1. `quantity <= 0`: `OUT_OF_STOCK`
2. `quantity - reservedQuantity <= 0`: `RESERVED`
3. Kullanilabilir miktar `1-3`: `LOW_STOCK`
4. Kullanilabilir miktar `4+`: `IN_STOCK`

Durum bir kullanici tercihi degildir. Fiziksel ve rezerve sayaclar
degistiginde server/domain ve veritabani ayni kuralla yeniden hesaplar.

## Kalan Kapsam

1. `Warehouse` ana veri modeli: kod, ad, aktiflik ve teslimat adresi.
2. Serbest metin depo kodunun kontrollu secime donusturulmesi.
3. Depolar arasi atomik transfer.
4. Sayim oturumu ve gerekceli fark duzeltme hareketi.
5. Transfer/sayim yetki, audit, idempotency ve rollback testleri.

ERP stok senkronizasyonu bu fazin parcasi degildir. Once portal icindeki stok
operasyonu deterministik hale getirilecek, ERP sonraki entegrasyon katmani
olacaktir.
