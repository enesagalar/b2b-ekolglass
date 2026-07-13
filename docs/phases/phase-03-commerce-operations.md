# Faz 3 - B2B Commerce Operasyonu

## Hedef

Bayi operasyonunun gercek siparis ve teklif akisina tasinmasi.

## Kapsam

- Urun CRUD ve teknik detay formlari.
- Katalog arama, filtre, sayfalama.
- Fiyat listesi atama ve bayi bazli fiyat gorunurlugu.
- Teklif sepeti.
- Teklif durum yonetimi.
- Siparis olusturma, onay ve durum gecmisi.
- Cari limit ve payment terms modelinin uygulanmasi.

## Cikis Kriterleri

- Bayi kendi yetkisiyle teklif/siparis baslatabilir.
- Satis ekibi teklifi fiyatlandirabilir.
- Siparis durumlari history ile izlenir.
- Fiyat gorunurlugu role/company bazli calisir.

## 2026-07-13 Ilerleme

Tamamlandi:

- Kalici siparis sepeti ve checkout.
- Firma adresi secimi/olusturma.
- Transactional server fiyat ve stok dogrulamasi.
- Company-scoped idempotency, request hash ve cart version kontrolu.
- Stok rezervasyon defteri ve siparis snapshot'lari.
- Bayi siparis detay/takip ekrani.
- Admin siparis liste ve salt okunur operasyon detayi.

Siradaki dilim:

- Transactional e-posta teslim adapteri.
- Stok invariant'lari icin DB check constraint'leri.

## 2026-07-13 Siparis Operasyon Dilimi

Tamamlandi:

- Role/capability bazli state transition matrisi.
- Order version CAS ve idempotent transition command ledger.
- `ON_HOLD` onceki operasyon asamasina guvenli donus.
- Cancellation release ve shipment consume stok muhasebesi.
- Shipment/takip zorunluluklari ve teslimde stok etkisiz gecis.
- Actor baglantili status history ve ayrintili audit metadata.
- Admin operasyon formu, pending/conflict/confirm durumlari.

## 2026-07-13 Teklif Operasyon Dilimi

Tamamlandi:

- Admin teklif kuyrugu, arama, durum filtresi, KPI ve sayfalama.
- Admin teklif detayi, firma/iletisim, kalemler, notlar ve aktorlu durum gecmisi.
- Kati teklif state machine ve fiyat/review/send/approve/cancel yetki ayrimi.
- Quote version CAS ve hash kontrollu idempotent operasyon komut defteri.
- Decimal string girdisi ve server-side satir/ara toplam hesaplama.
- Talep ani katalog tahmini ile baglayici admin teklifi birbirinden ayrildi.
- Immutable `QuoteOfferRevision` ve `QuoteOfferRevisionItem` modeli.
- Aktif teklif revizyonunun admin ve bayi detayinda ortak, ic not sizintisi olmadan gosterimi.
- `pricedAt` yalniz gercek admin fiyatlandirmasinda set edilecek sekilde duzeltildi.
- Admin shell ve dashboard teklif operasyonuna baglandi.
- Unit, SQLite entegrasyon, HTTP smoke ve responsive browser QA kontrolleri eklendi.

## 2026-07-13 Tekliften Siparise Donusum Dilimi

Tamamlandi:

- Yalniz `APPROVED` teklif icin ayri `quote.convert` yetkisi ve admin aksiyonu.
- Aktif immutable teklif revizyonundan fiyat, miktar ve teknik snapshot aktarimi.
- Kaynak teklif, teklif surumu, revizyon ve revizyon kalemi baglantili siparis audit zinciri.
- Firma adresi snapshot'i ve istenen teslim tarihinin sipariste korunmasi.
- Tek transaction icinde siparis, kalem, coklu depo rezervasyonu, iki history ve audit kayitlari.
- Hash kontrollu idempotent command ledger, quote version CAS ve tek siparis unique garantisi.
- Dondurulmus revizyon, yetersiz stok, farkli payload ve replay entegrasyon testleri.
- Admin tekliften siparise ve siparisten teklife; bayi teklif/siparis detaylari arasinda izlenebilir baglantilar.

## 2026-07-13 Entegrasyon Outbox Dilimi

Tamamlandi:

- Siparis/teklif transaction'lariyla atomik, provider-bagimsiz outbox modeli.
- Tek SQL `UPDATE ... RETURNING` ile yarisa dayanikli claim ve acik lease bitis zamani.
- Token kontrollu success/failure finalize, exponential retry ve dead-letter gecisi.
- Her teslim denemesi icin `IntegrationLog` baglantisi.
- Siparis, teklif, donusum ve durum degisikligi icin versiyonlu domain olaylari.
- City Lojistik sevkiyata hazir olayinin adapter kapaliyken dahi guvenli kuyruklanmasi.
- Transaction rollback, idempotency, cift worker, stale lease, eski token ve retry testleri.
- City API ve provider idempotency sozlesmesi gelmeden canli handler'in fail-closed tutulmasi.
- 24 test dosyasi, 116 test, production build, sifirdan 18 migration ve admin HTTP smoke kontrolu.
