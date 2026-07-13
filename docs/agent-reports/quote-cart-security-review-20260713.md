# Quote Cart Security Review

Tarih: 2026-07-13

Agent incelemesi, `QuoteRequest` modelini hem taslak sepet hem kalici teklif olarak kullanmanin yasam dongulerini karistiracagini ve mevcut fiyat secicinin miktar kademesini dikkate almadigini tespit etti.

Uygulanan kararlar:

- Sepet `QuoteCart`/`QuoteCartItem` modellerine ayrildi.
- Tenant sahipligi firma ve kullanici anahtariyla sinirlandi.
- Miktar-aware fiyat secimi ve deterministik scope/priority sirasi eklendi.
- Fiyat kaynagi, minimum adet, scope, birim fiyat ve satir toplami snapshot olarak saklandi.
- Idempotent submit, transaction icinde tenant tekrar dogrulamasi ve audit log eklendi.
- Cross-company mutasyon, fiyat kademesi ve tekrar submit entegrasyon testi yazildi.
