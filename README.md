# EkolGlass B2B Portal

EkolGlass icin profesyonel B2B bayi, katalog, teklif, siparis, CMS ve entegrasyon portali temeli.

Bu repo bir demo vitrin degil; public site, dealer portal, admin/CMS ve entegrasyon katmanlari ayrilarak buyutulecek bir urun temelidir.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma 7
- SQLite lokal gelistirme, PostgreSQL hedef mimari
- Vitest

## Ana Moduller

- Bayi basvuru ve onay temeli
- Urun, kategori, stok ve fiyat listesi veri modeli
- Veritabanindan beslenen katalog
- Admin operasyon dashboard temeli
- CMS veri modeli: `Page`, `PageBlock`, `MediaAsset`, `SiteSetting`
- Kargo entegrasyon katmani: `ShippingProvider`, `Shipment`, `ShipmentEvent`, `IntegrationLog`
- Company-scoped siparis/teklif sepetleri, server-side checkout ve stok rezervasyonu
- Bayi siparis takibi ve admin siparis operasyon gorunumu
- City Lojistik adapter iskeleti
- Rol ve izin sabitleri
- Faz ve agent prompt dokumantasyonu

## Calistirma

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Yerel adres:

```text
http://127.0.0.1:3000
```

## Dogrulama

```bash
npm run lint
npm run test
npm run build
npx prisma migrate status
```

## Mimari Dokumanlar

- `docs/00-master-operating-context.md`
- `docs/01-roadmap.md`
- `docs/02-current-state.md`
- `docs/03-owner-collaboration-guide.md`
- `docs/security/security-baseline.md`
- `docs/architecture/adr-0001-portal-admin-cms-integration-split.md`
- `docs/architecture/cms-decision-matrix.md`
- `docs/architecture/shipping-integration-contract.md`
- `docs/architecture/auth-login-rate-limit.md`
- `docs/research/2026-07-02-b2b-cms-shipping-research.md`

## Proje Takibi

Kod yazmayan proje sahibi icin en pratik takip sirasi:

1. `docs/02-current-state.md` - su an ne calisiyor, ne eksik?
2. `docs/01-roadmap.md` - fazlar hangi sirada?
3. `docs/03-owner-collaboration-guide.md` - hangi kararlari sen vermelisin?
4. `docs/security/security-baseline.md` - security kapilari neler?
5. `docs/04-next-actions.md` - siradaki kodlama turunda ne yapilacak?

Siradaki ana faz:

- `docs/phases/phase-02-5-admin-ux-shell.md`
- `docs/ux/admin-shell-spec.md`

## Not

City Lojistik icin public ve dogrulanabilir API dokumani bulunmadigi icin sahte canli endpoint yazilmadi. Adapter varsayilan olarak pasiftir; canli entegrasyon icin API dokumani, test endpointi ve hesap bilgileri gerekir.
