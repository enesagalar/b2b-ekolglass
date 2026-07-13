# Guncel Proje Durumu

Son guncelleme: 2026-07-13

## Git Durumu

- Aktif branch: `main`
- Remote: `https://github.com/enesagalar/b2b-ekolglass.git`
- Son bilinen commitler:
  - `d6a5666 Split product category and price list admin screens`
  - `bc4625d Add media soft deactivation workflow`
  - `2934cc0 Enforce catalog price and stock visibility`
  - `68bf9a7 Add product compatibility management and advisor reports`
  - `4ead9a0 Add codex fleet operating guide`

## Calisan Temel Parcalar

- Next.js App Router uygulamasi.
- Prisma 7 + SQLite lokal veritabani.
- Seed verisi.
- Admin login:
  - `admin@ekolglass.local`
  - lokal fallback sifre: `EkolGlass2026!`
- DB session ve httpOnly cookie.
- Admin route guard.
- Audit log modeli ve kritik admin action loglari.
- Public ana sayfa.
- Oturum duyarlı, CMS banner'li public ticaret ana sayfasi.
- Public urun kesfi: `/urunler`.
- Guest ve bayi icin ortak urun ticaret alani: `/urunler`.
- Eski `/bayi/urunler` ve `/bayi/teklif-sepeti` rotalarinda kalici yonlendirme.
- Bayi ve ic ekip icin ayrilmis giris akislari.
- Public sitemap ve private route robots/noindex politikalari.
- Bayi basvuru formu.
- Admin bayi basvurusu liste/detay ekranlari.
- Permission kontrollu bayi inceleme ve durum gecis akisi.
- Onaydan transaction tabanli firma ve `DEALER_OWNER/INVITED` kullanici uretimi.
- Musteri grubu, odeme kosulu ve kredi limiti atamasi.
- `/admin/firmalar` liste/detay ve aktivasyon daveti yonetimi.
- `/aktivasyon/[token]` ilk parola ve hesap aktivasyonu.
- Admin firma detayinda ek bayi kullanicisi olusturma, askilama, yeniden etkinlestirme ve soft devre disi birakma.
- Ayri hash token modeliyle iki saatlik tek kullanimlik `/parola-sifirla/[token]` akisi.
- Askilama ve parola yenilemede tum aktif oturumlarin iptali.
- Dealer login role-based `/` yonlendirmesi; firma kimligi header'da gorunur.
- Merkezi dealer context: ACTIVE dealer + APPROVED company.
- Bayi operasyon dashboardu ve responsive bayi shell.
- Bayi siparis, teklif ve firma hesap ekranlari.
- Public ve bayi urun detay ekranlari; aktif medya, teknik ozellik ve uyumluluk gorunumu.
- Kullanici+firma kapsamli kalici teklif sepeti.
- Gonderim aninda DB'den yeniden fiyatlanan, fiyat kaynagi/kademe snapshot'li teklif talebi.
- Company-scoped teklif detay ve tekrar erisilebilir basari ekrani.
- Company-scoped order/quote DAL ve cross-company SQLite testi.
- Kullanici+firma kapsamli kalici siparis sepeti ve `/sepet` checkout ekrani.
- Teslimat adresi secimi ve checkout icinden yeni firma adresi olusturma.
- Gonderim aninda server-side fiyat, firma, kullanici, urun ve stok yeniden dogrulamasi.
- Cart version, company-scoped idempotency ve request hash ile cift/stale gonderim korumasi.
- Transaction icinde deterministik coklu depo stok rezervasyonu ve fiyat/urun/adres snapshot kayitlari.
- Bayi siparis detay, durum gecmisi ve sevkiyat takip ekrani.
- Admin siparis liste, filtre, firma/bayi, teslimat, kalem ve rezervasyon detay ekranlari.
- Admin siparis durum gecis matrisi ve role ayrilmis review/approve/fulfill/ship/deliver/cancel yetkileri.
- Monoton siparis version'i ve idempotent `OrderTransitionCommand` ile cift gonderim korumasi.
- `ON_HOLD` siparisin yalnizca bekletildigi asamaya geri donmesi.
- Iptalde rezervasyon release; sevkte fiziksel stok + rezervasyon consume; teslimde ikinci stok etkisi olmamasi.
- Durum history kaydinda islemi yapan kullanici ve audit metadata'sinda stok once/sonra degerleri.
- Admin listesinde depo rolunden fiyat, muhasebe rolunden rezervasyon detayinin gizlenmesi.
- DB seviyesinde firma/musteri grubu fiyat izolasyonu.
- Admin dashboard temeli.
- Admin shell:
  - Sol menu
  - Ust bar
  - Mobil menu
  - Operasyon dashboard
- Admin CMS ayar ekrani.
- Admin urun/kategori/fiyat/stok yonetimi.
- Admin urun liste arama/filtre/sayfalama.
- Admin kategori yonetimi alt ekrani: `/admin/urunler/kategoriler`.
- Admin fiyat listesi alt ekrani: `/admin/urunler/fiyat-listeleri`.
- Admin urun detay sayfasi.
- Admin urun detayinda stok/fiyat guncelleme formlari.
- Admin urun detayinda medya/teknik dosya ekleme ve guncelleme.
- Admin urun detayinda medya/teknik dosya soft aktif/pasif yonetimi.
- Admin urun detayinda uyumluluk/OEM ekleme ve guncelleme.
- Admin urun detayinda uyumluluk/OEM duplicate engeli ve audit log'lu silme.
- Public katalog arama/filtre.
- Public katalogda role-based fiyat/stok gorunurlugu.
- Public katalogda OEM/uyumluluk kayitlari uzerinden arama.
- Catalog server action testleri:
  - Uyumluluk duplicate engeli
  - Uyumluluk silme sahiplik kontrolu
  - Uyumluluk audit/revalidation
- Arka plan Codex advisor rapor hatti:
  - `scripts/codex-advisor.ps1`
  - `docs/agent-reports/`
- City Lojistik adapter siniri, canli API bilgisi bekliyor.

## En Onemli Eksikler

1. Bayi platformunda kalanlar:
   - Transactional e-posta teslim adapteri yok.
   - Teklif listesinde filtre ve sayfalama yok.
   - Company ownership list/dashboard seviyesinde testli; detay/action testleri eksik.

2. Urun yonetimi ilerledi ama bazi operasyonlar tamamlanmadi:
   - Firma bazli fiyat gorunurlugu UI'da basladi; bayi firma/onay akisi eksik oldugu icin gercek bayi testleri sonraki faza kaldi.

3. Teklif/siparis akisinda kalanlar:
   - Teklif sepeti ve teklif talebi tamamlandi; admin fiyatlandirma/durum gecis operasyonu eksik.
   - Admin teklif fiyatlandirma ve durum gecis operasyonu eksik.

4. Entegrasyonlar hazirlik seviyesinde:
   - City Lojistik canli API dokumani gerekli.
   - ERP/MES entegrasyonu henuz taslak.

5. Birlesik kurumsal web/CMS gecisi planlandi ama uygulanmadi:
   - Root gateway henuz acilmadi.
   - Canli URL/SEO/medya envanteri ve redirect haritasi gerekli.
   - CMS navigation, redirect, locale/path ve genis SEO modelleri eksik.

## Bir Sonraki Dogru Adim

Faz 3.3 devam edecek: Admin Teklif Operasyonlari, Transactional E-posta ve City Lojistik Outbox Siniri.

UX/IA konsolidasyonu tamamlandi: public urun kesfi, bayi urun/fiyat alani, oturum duyarlı ana sayfa ve ayrik yonetim girisi devrede. Siradaki adim company-scoped detay/olusturma akislarini kurmak ve e-posta davet teslim adapterini baglamaktir. Kalici kararlar `docs/architecture/commerce-ux-information-architecture.md` icindedir.

Siradaki hedef ekranlar:

- `/bayi`
- `/bayi/hesabim`
- E-posta invitation adapteri
