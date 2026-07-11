# Proje Sahibi ile Calisma Rehberi

Bu dosyanin amaci kod yazmayan proje sahibini surecin icinde tutmaktir.

## Proje Sahibinin Karar Vermesi Gereken Konular

### Marka ve UX

- Admin panel sol menusunde hangi modul isimleri kullanilacak?
- EkolGlass tonu daha endustriyel/kurumsal mi, daha modern e-ticaret operasyonu gibi mi olmali?
- Dashboard'da ilk bakista en onemli 5 metrik hangileri?

Onerilen ilk metrikler:

- Bekleyen bayi basvurusu
- Dusuk stok / stok yok urun
- Acik teklif talebi
- Onay bekleyen siparis
- Sevke hazir siparis

### Operasyon

- Bayi basvurusu onayi kim tarafindan yapilir?
- Onaylanan bayi otomatik kullanici alacak mi, yoksa admin elle mi acacak?
- Stok bilgisi bayiye adet olarak mi, "stokta / sorunuz" gibi sade mi gosterilecek?
- Fiyatlar tum bayilere ayni mi, musteri grubu/firma bazli mi olacak?

### Entegrasyon

- City Lojistik API dokumani, test hesabi ve endpointleri kimden alinacak?
- ERP/MES sistemi var mi, varsa adlari ve veri alisveris yontemi nedir?

## Codex Calisirken Proje Sahibine Raporlanacaklar

Her anlamli faz sonunda:

- Hangi dosyalar degisti?
- Hangi is akisi calisir oldu?
- Hangi testler calisti?
- GitHub commit hash nedir?
- Sira ne?

## Proje Sahibinin Kontrol Edebilecegi Basit Seyler

- `http://localhost:3000/` public ana sayfa.
- `http://localhost:3000/urunler` herkese açık ürün keşfi.
- `http://localhost:3000/bayi/urunler` oturum açmış bayiye özel ürün ve fiyat ekranı.
- `http://localhost:3000/giris` admin girisi.
- `http://localhost:3000/admin` admin dashboard.
- `http://localhost:3000/admin/urunler` urun operasyonu.
- `http://localhost:3000/admin/icerik` CMS ayarlari.

## Karar Kaydi Kuralimiz

Kalici mimari veya UX karari alindiginda bu dosyalardan birine islenir:

- `docs/01-roadmap.md`
- `docs/02-current-state.md`
- `docs/decisions/`
- ilgili `docs/phases/phase-*.md`
