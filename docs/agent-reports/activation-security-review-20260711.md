# Agent Raporu - Aktivasyon ve Tenant Guvenligi

Tarih: 2026-07-11

## Ana Bulgular

- Auth DAL tam `User` kaydiyla `passwordHash` donduruyordu.
- Bayi fiyat izolasyonu DB sorgusunda degil, render sonrasi secimde uygulaniyordu.
- Dealer login her rolde `/admin`e gidiyordu.
- Aktivasyon bcrypt maliyeti token on kontrolunden once calistirilirsa CPU DoS riski olusabilirdi.
- Token URL'si noindex/no-referrer ve tek kullanimli olmali.
- Kullanici ancak `INVITED`, parolasiz, bayi rolunde ve onayli firmaya bagliysa aktive edilmeli.

## Uygulanan Kararlar

- `getCurrentUser` hassas alanlari donmeyen dar select kullaniyor.
- Render sirasinda expired session silme mutasyonu kaldirildi.
- Dealer login `/katalog`a, ic roller `/admin`e yonleniyor.
- Katalog fiyatlari DB seviyesinde firma/grup/public scope ile filtreleniyor.
- Aktivasyon tokeni 256-bit random, DB'de SHA-256 hash, 48 saatlik ve tek kullanimli.
- Aktivasyon CAS consume, user update, session temizligi ve audit tek transaction.
- Aktivasyon sayfasi noindex ve `no-referrer`.
- Production manuel link gosterimi varsayilan kapali.

## Kalan Borc

- IP + hesap anahtarli indeksli login rate-limit modeli.
- Transactional e-posta teslim adapteri.
- Merkezi dealer context DAL ve tum siparis/teklif sorgularinda company ownership.
