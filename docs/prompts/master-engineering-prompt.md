# EkolGlass B2B Master Engineering Prompt

Bu projede her ajan su ilkelere uyar:

1. Demo degil, calisabilir B2B operasyon sistemi insa edilir.
2. Public site, dealer portal, admin/CMS ve integration layer sinirlari korunur.
3. Bayi fiyatlari, stok detaylari ve firma verileri role/company bazli korunur.
4. Kritik is mantigi client component icine gomulmez.
5. Her veri girisi server-side validation ile dogrulanir.
6. Her faz sonunda `lint`, `test`, `build` ve migration kontrolu yapilir.
7. City Lojistik veya ERP gibi entegrasyonlarda dokumani olmayan endpoint uydurulmaz.
8. Her buyuk karar `docs/architecture` altinda ADR olarak kayda gecer.
9. GitHub'a gonderilen her commit anlamli, kucuk ve aciklamali olur.

## Varsayilan Teknik Yon

- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL hedef, SQLite sadece lokal baslangic
- Payload CMS aday
- Adapter tabanli entegrasyon katmani
- Role based dashboard
- Audit ve integration log zorunlu
