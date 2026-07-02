# CMS Karar Matrisi

| Kriter | Payload CMS | Strapi | Directus |
| --- | --- | --- | --- |
| Next.js uyumu | Cok yuksek | Orta | Orta |
| TypeScript/code-first | Cok yuksek | Orta | Orta |
| Hazir admin panel | Yuksek | Cok yuksek | Cok yuksek |
| Access control | Fonksiyon bazli, esnek | RBAC admin odakli | Veri/rol/field odakli |
| Icerik ekibi deneyimi | Iyi | Cok iyi | Cok iyi |
| Veri tabani uzerine hizli admin | Orta | Orta | Cok yuksek |
| B2B is mantigi entegrasyonu | Yuksek | Orta | Orta |
| Onerilen kullanim | EkolGlass uzun vadeli ana aday | Icerik ekibi agirlikli alternatif | SQL data studio alternatifi |

## Oneri

Faz 2 sonunda auth ve Postgres karari netlesince Payload CMS pilotu yapilacak. Bu pilotta su koleksiyonlar denenmeli:

- Pages
- Page Blocks
- Media
- Products
- Product Categories
- Dealer Applications
- Site Settings

Payload kullanilirsa public/dealer frontend ayni Next.js runtime icinden Local API ile CMS verisine erisebilir. Access control fonksiyonlari admin ve bayi rollerini ayiracak sekilde yazilmalidir.
