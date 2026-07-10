# Faz 3.2 - Bayi Basvurusu, Firma ve Kullanici Akisi

Durum: Devam ediyor. Admin inceleme ve firma/kullanici provisioning dilimi tamamlandi; aktivasyon ve gercek bayi izolasyon testi siradaki dilimdir.

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
- Bayi baska firmanin verisine erisemez.

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

## Siradaki Dilim

1. Tek kullanimlik, suresi dolan aktivasyon token modeli.
2. Bayinin ilk sifresini kendi belirledigi aktivasyon ekrani.
3. `/admin/firmalar` liste/detay ve firma kullanicisi yonetimi.
4. Gercek `DEALER_OWNER` oturumuyla firma/fiyat veri izolasyonu entegrasyon testi.
5. Davet e-postasi adapter siniri; SMTP saglayicisi gelene kadar log veya ekranda token tutulmayacak.
