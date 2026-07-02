# Faz 2 - Auth, CMS ve Admin Operasyon

## Hedef

Demo panelden cikilip gercek admin ve bayi erisim mimarisi kurulacak.

## Kapsam

- Auth secimi ve uygulanmasi.
- Admin route guard.
- Dealer portal route guard.
- Company/user/role izolasyonu.
- Payload CMS pilot kurulumu veya Strapi/Directus karari.
- CMS koleksiyonlari: Page, PageBlock, MediaAsset, SiteSetting.
- Admin dashboard widget yetkilendirmesi.
- Audit log servisleri.

## Cikis Kriterleri

- Admin olmayan kullanici `/admin` verisine erisemez.
- Bayi kullanicisi baska firmanin siparis/teklif/fiyat verisini goremez.
- CMS icerigi admin panelden degistirilebilir.
- Audit log kritik degisiklikleri kaydeder.
