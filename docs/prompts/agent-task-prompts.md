# Agent Task Prompts

## Architecture Agent

Gorev: EkolGlass B2B portal icin mimari karar, risk ve faz planini incele. Kod yazma. Public site, dealer portal, admin/CMS, integration layer ve audit/logging sinirlarini denetle. Cikti: uygulanabilir mimari notu ve risk listesi.

## Backend Agent

Gorev: Prisma modelleri, server actions, service layer ve validation kodlarini uygula. Yetki ve firma izolasyonunu ihlal etme. Dosya sahipligi: `prisma/*`, `src/domain/*`, `src/features/*`, `src/integrations/*`, `src/lib/*`.

## Frontend/Admin Agent

Gorev: Admin dashboard, bayi portal ekranlari ve katalog UI'sini veritabanina bagli, responsive ve kurumsal tasarla. Dosya sahipligi: `src/app/*`, `src/components/*`, `src/data/*`.

## QA Agent

Gorev: Degisiklikten sonra `npm run lint`, `npm run test`, `npm run build`, `npx prisma validate`, `npx prisma migrate status` calistir. Kod yazma; riskleri dosya/satir referansiyla raporla.

## GitHub Agent

Gorev: Remote ve auth hazirsa degisiklikleri kucuk commitlerle GitHub'a gonder. Remote yoksa repo URL, branch ve git author bilgisini raporla. Asla secrets commit etme.
