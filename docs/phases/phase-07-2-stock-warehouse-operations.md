# Faz 7.2 - Stok ve Depo Operasyonlari

Durum: Devam ediyor.

## Tamamlanan Kapsam

- Urun ve depo bazli fiziksel, rezerve ve kullanilabilir stok raporu.
- Rezervasyon ve hareket defteri mutabakati.
- CSV stok aktarimi ve stok hareketleri baglantisi.
- Ayrik `/admin/stok` operasyon rotasi.
- Her depo satirinin kendi optimistic concurrency surumuyle guncellenmesi.
- Urun detayindaki stok satirlarina dogrudan operasyon baglantisi.

## Kalan Kapsam

1. `Warehouse` ana veri modeli: kod, ad, aktiflik ve teslimat adresi.
2. Serbest metin depo kodunun kontrollu secime donusturulmesi.
3. Depolar arasi atomik transfer.
4. Sayim oturumu ve gerekceli fark duzeltme hareketi.
5. Transfer/sayim yetki, audit, idempotency ve rollback testleri.

ERP stok senkronizasyonu bu fazin parcasi degildir. Once portal icindeki stok
operasyonu deterministik hale getirilecek, ERP sonraki entegrasyon katmani
olacaktir.
