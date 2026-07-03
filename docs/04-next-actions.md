# Siradaki Aksiyonlar

Bu dosya her calisma turunda guncellenir. Amaci "nerede kalmistik?" sorusunu azaltmaktir.

## Aktif Hedef

Faz 2.5 - Admin UX Shell ve Operasyon Merkezi.

## Bir Sonraki Kodlama Turunda Yapilacaklar

1. `src/app/admin/layout.tsx` ortak admin shell'e donusturulecek.
2. Sidebar component'i eklenecek.
3. Admin menu config'i merkezi dosyaya alinacak.
4. `/admin` dashboard operasyon merkezi olarak yeniden tasarlanacak.
5. `/admin/urunler` shell icine alinacak.
6. `/admin/icerik` shell icine alinacak.
7. Desktop ve mobile browser smoke test yapilacak.
8. `npm run check` calistirilacak.
9. Commit ve GitHub push yapilacak.

## Bu Turda Yeni Business Logic Eklenmeyecek

Bu fazin amaci:

- Navigasyon
- Dashboard UX
- Admin bilgi mimarisi
- Profesyonel gorunum

Yeni teklif/siparis, bayi onay veya City Lojistik is mantigi bu fazdan sonra gelecek.

## Proje Sahibinden Beklenen Kararlar

Asagidaki kararlar UI uygulanmadan once veya uygulama sirasinda netlesebilir:

- Sidebar modul adlari uygun mu?
- Dashboard'da ilk siradaki metrikler dogru mu?
- Admin panel daha koyu/kurumsal mi, daha acik/sade mi ilerlesin?
- Pasif moduller "Yakinda" etiketiyle gorunsun mu, yoksa tamamen gizlensin mi?

Varsayilan karar:

- Acik, sade, kurumsal operasyon paneli.
- Pasif moduller "Yakinda" etiketiyle gorunecek.
- Dashboard metrikleri is aksiyonu oncelikli olacak.
