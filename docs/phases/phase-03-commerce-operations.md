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

- Teklif sepeti version/CAS ve payload-hash idempotency sertlestirmesi.
- Onaylanan teklifin idempotent siparise donusumu.
- City Lojistik adapterine outbox uzerinden siparis/sevkiyat aktarimi.
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
