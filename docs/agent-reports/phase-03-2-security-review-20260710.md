# Faz 3.2 Agent Guvenlik Incelemesi - 2026-07-10

## Gorev

DealerApplication admin liste/detay ve onaydan Company + DEALER_OWNER uretme akisinin model, transaction, idempotency, permission ve test risklerini read-only incelemek.

## Bulunan Kritik Riskler

1. `requireAdminUser` tum ic rolleri kabul ettigi icin depo ve muhasebe rolleri bayi PII verisini okuyabilir veya inceleme action'i calistirabilirdi.
2. Iki adminin eski ekranlardan guncelleme yapmasini engelleyen optimistic concurrency kontrolu yoktu.
3. Mevcut kullaniciyi otomatik `DEALER_OWNER` rolune yukseltmek yetki genisletme riski tasiyordu.
4. E-posta ve vergi numarasi cakismalari ikinci bir firma veya yanlis hesap baglantisi uretebilirdi.
5. Mock test tek basina SQLite FK, transaction ve tekrar onay davranisini kanitlamiyordu.
6. Liste ve entity audit sorgulari icin uygun indeksler yoktu.

## Ana Uygulamaya Alinan Kararlar

- Sayfa ve action seviyesinde `dealer.application.review` permission kontrolu.
- `expectedUpdatedAt` tabanli conflict kontrolu.
- Acik durum transition tablosu; onayli basvuru terminal kabul edildi.
- Company, User, DealerApplication ve AuditLog icin tek Prisma transaction.
- Deterministik company/user kimlikleri ve tekrar onayda create yerine mevcut baglantiyi kullanma.
- Mevcut kullanicida otomatik rol terfisi yapmama; sadece ayni firmadaki mevcut `DEALER_OWNER` tekrar kullanilabilir.
- E-posta, vergi numarasi ve firma cakisma kontrolleri.
- Kullanici `INVITED`, `passwordHash=null`; aktivasyon tamamlanmadan login yok.
- Gercek `dev.db` uzerinde tekrar onay entegrasyon testi.
- DealerApplication ve AuditLog sorgu indeksleri.

## Sonraki Guvenlik Borcu

- DealerApplication icinde reviewer ve uretilen owner icin acik Prisma iliskileri.
- Company vergi numarasi icin normalize edilmis DB seviyesinde business unique karari.
- Tek kullanimlik, hash'li ve sureli aktivasyon token'i.
- Gercek dealer oturumuyla cross-company veri izolasyonu testleri.
