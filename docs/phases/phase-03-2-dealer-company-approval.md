# Faz 3.2 - Bayi Basvurusu, Firma ve Kullanici Akisi

Durum: Temel kapsam tamamlandi. E-posta teslim adapteri ve genis dealer portal izolasyonu sonraki faza devredildi.

## Hedef

Bayi basvurusu formunu gercek B2B musteri kabul surecine baglamak.

## Kapsam

- `/admin/bayi-basvurulari` listesi.
- Basvuru detay ekrani.
- Durum degistirme:
  - Yeni
  - Incelemede
  - Bilgi bekleniyor
  - Onaylandi
  - Reddedildi
- Onaydan `Company` olusturma.
- Onaydan bayi kullanicisi olusturma.
- Customer group atama.
- Payment terms ve credit limit girisi.
- Audit log.

## Proje Sahibinin Karar Vermesi Gerekenler

- Onaylanan bayiye kullanici otomatik mail ile mi acilacak?
- Ilk sifre nasil belirlenecek?
- Bayi tek firma sahibi mi olacak, yoksa bir firmada birden fazla kullanici olacak mi?
- Bayi fiyatlari customer group ile mi, firma bazli ozel listeyle mi baslayacak?

## Cikis Kriterleri

- [x] Admin basvuruyu inceleyebilir.
- [x] Onaylanan basvurudan firma kaydi uretilir.
- [x] Firma kullanicisi bayi roluyle olusturulur.
- [x] Bayi katalog sorgusunda baska firmanin veya grubun fiyatina erisemez.

## Tamamlanan Ilk Dilim

- `/admin/bayi-basvurulari` arama, durum filtresi, sayfalama ve KPI'larla eklendi.
- `/admin/bayi-basvurulari/[id]` basvuru, ticari kosul, firma/kullanici ve audit gorunumu ile eklendi.
- Durum gecisleri acik transition tablosuyla sinirlandi.
- Eski admin ekranindan gelen guncellemeler `expectedUpdatedAt` ile conflict olarak durduruluyor.
- Onay islemi `Company`, `DEALER_OWNER`, `DealerApplication` ve `AuditLog` kayitlarini tek transaction'da uretiyor.
- Kullanici `INVITED` ve `passwordHash=null` olusuyor; aktivasyon akisi tamamlanmadan login olamiyor.
- E-posta, vergi numarasi, mevcut kullanici rolu ve firma eslesmesi icin guvenlik kontrolleri eklendi.
- `dealer.application.review` permission kontrolu action ve veri okuma sayfalarina eklendi.
- Liste ve audit sorgulari icin veritabani indeks migration'i eklendi.
- Unit, gercek SQLite integration, HTTP smoke ve responsive browser kontrolleri basarili.

## Tamamlanan Ikinci Dilim

- Tek kullanimlik, hash'li ve 48 saatlik aktivasyon token modeli/migration'i.
- `/aktivasyon/[token]` guclu ilk parola belirleme ekrani.
- `/admin/firmalar` liste/detay, ticari kosul, kullanici ve audit gorunumu.
- Davet yenilemede eski tokenlari revoke eden permission kontrollu action.
- Dealer login icin role gore `/katalog` yonlendirmesi ve `/admin` erisim reddi.
- Fiyat listelerini DB seviyesinde firma/grup/public scope ile sinirlayan catalog DAL.
- Gercek SQLite aktivasyon ve cross-company fiyat izolasyonu testleri.
- Production manuel aktivasyon linki varsayilan kapali; e-posta adapteri deployment on kosulu.

## Sonraki Faza Devredilenler

1. Transactional e-posta adapteri.
2. Merkezi dealer context DAL.
3. `/bayi` dashboard ve firma kullanicisi yonetim komutlari.
4. Teklif, siparis ve sevkiyat sorgularinda company ownership testleri.
