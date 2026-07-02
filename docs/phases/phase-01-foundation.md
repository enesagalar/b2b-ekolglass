# Faz 1 - Temel Platform Uygulama Notlari

Bu fazin amaci calisan bir demo vitrininden ziyade, sonraki gercek B2B modullerinin uzerine kurulacagi temeli olusturmaktir.

Kararlar:

- Stack: Next.js App Router, TypeScript, Tailwind CSS.
- Gelistirme veritabani: SQLite.
- ORM: Prisma 7 ve `better-sqlite3` driver adapter.
- Turkce ilk dil olarak kullanilir.
- Rol ve izinler `src/domain/roles.ts` icinde merkezi tutulur.
- Siparis, teklif, bayi basvurusu ve stok durumlari `src/domain/statuses.ts` icinde merkezi tutulur.
- Admin banner duzenleme ihtiyaci `SiteSetting` ve `MediaAsset` modelleriyle ayri veri katmanina alinir.

Bir sonraki faza gecmeden once yapilacaklar:

1. Gercek oturum sistemi secimi ve uygulanmasi.
2. Admin route guard'in bootstrap/demo yaklasimindan gercek session yaklasimina tasinmasi.
3. Bayi basvuru inceleme ekraninin veritabanindan okunmasi.
4. Katalog ekraninin Prisma sorgularina baglanmasi.
5. Urun arama icin indeks ve sayfalama kararlarinin uygulanmasi.
