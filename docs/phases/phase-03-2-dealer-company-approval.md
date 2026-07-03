# Faz 3.2 - Bayi Basvurusu, Firma ve Kullanici Akisi

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

- Admin basvuruyu inceleyebilir.
- Onaylanan basvurudan firma kaydi uretilir.
- Firma kullanicisi bayi roluyle olusturulur.
- Bayi baska firmanin verisine erisemez.
