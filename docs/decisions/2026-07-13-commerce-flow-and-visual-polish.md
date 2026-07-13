# Ticaret Akisi ve Gorsel Parlatma Karari

Tarih: 2026-07-13

## Karar

- Ana sayfa ve `/urunler` urun kesfi ile ticari islemlerin baslangicidir.
- Bayi girisi sonrasinda kullanici ana sayfada kalir; hesap merkezi sag ust alandan acilir.
- `/bayi` yeni siparis verilen ekran degil, teklif, siparis ve sevkiyat takibinin yapildigi dashboard'dur.
- Admin ve bayi oturumlari hem giris rotasi hem public kimlik hem fiyat yetkisi seviyesinde ayridir.
- Kullanici silme hard delete ile degil `SUSPENDED` ve `DISABLED` durumlariyla, audit kaydi korunarak yapilir.

## Gorsel Faz Kapisi

Siparis, teklif, CMS ve responsive akislari fonksiyonel olarak tamamlanmadan kapsamli gorsel yeniden tasarim yapilmaz. Son parlatma diliminde:

- GPT Image 2 ile gercek otomotiv cami, uretim ve urun baglami tasiyan banner/urun gorselleri uretilir.
- Glass-effect yalnizca header, modal, secili filtre ve katmanli yuzeylerde kontrollu kullanilir.
- Okunabilirlik, kontrast, mobil performans ve reduced-motion kabul kriteridir.
- Dashboard operasyonel ve yogun kalir; dekoratif blur veri okunabilirligini azaltamaz.
