# EkolGlass B2B Portal - Ana Calisma Baglami

Bu proje EkolGlass icin tuketici e-ticaret sitesi degil, profesyonel B2B bayi ve siparis operasyon portalidir.

Oncelik sirasi:

1. Guvenli kimlik dogrulama ve rol tabanli yetki sistemi.
2. Bayi basvurusu, onay ve musteri grubu atama akisi.
3. Admin operasyon paneli.
4. Urun, kategori, stok ve teknik detay veri modeli.
5. Guclu katalog arama ve teklif talebi.
6. Bayi/grup bazli fiyat gorunurlugu.
7. Siparis ve sevkiyat takibi.
8. Raporlama, bildirim ve ERP/MES entegrasyon hazirligi.

Tasarim dili kurumsal, endustriyel, hizli ve sade olmalidir. Gorsel kalite onemlidir, ancak B2B is akislarini golgelememelidir.

Her faz sonunda lint, test ve build kontrolu hedeflenir. Kritik is mantigi sadece frontend state icinde tutulmaz; domain sabitleri, validation, Prisma modelleri ve servis/server action katmani ayrilir.

## Her Yeni Calisma Turunda Okunacak Dosyalar

1. `docs/00-master-operating-context.md`
2. `docs/01-roadmap.md`
3. `docs/02-current-state.md`
4. `docs/03-owner-collaboration-guide.md`
5. Ilgili faz dosyasi
6. `docs/security/security-baseline.md`

Bu liste projenin hafizasidir. Yeni ozellik, refactor veya UI calismasina baslamadan once mevcut durum ve faz kapilari kontrol edilir.
