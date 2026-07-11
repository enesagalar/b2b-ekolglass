# Dealer Context Agent Review - 2026-07-11

## Ana Bulgular

- Katalog disinda tenant baglami merkezi degildi.
- Company kimligi session kullanicisindan turetilmeli; URL/form girdisi kabul edilmemeli.
- ACTIVE dealer, APPROVED company ve dealer role kosullari tek DAL'da fail-closed uygulanmali.
- Siparis/teklif detay sorgulari `id + companyId` ile calismali.
- Customer group fiyat paylasimi icindir; operasyon kaydi sahipligi icin kullanilamaz.

## Uygulananlar

- `src/data/dealer-context.ts`
- `src/data/dealer-portal.ts`
- `/bayi` layout ve portal rotalari
- Cross-company SQLite entegrasyon testi
- Operasyon sorgu indeksleri

## Takip Borcu

- Quote requester user relation.
- Order delivery address relation.
- Company-scoped detay DAL'lari.
- Forged action input ve cross-company address testleri.
