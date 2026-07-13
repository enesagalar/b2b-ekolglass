# Siparis Yasam Dongusu Security ve UX Incelemesi

Tarih: 2026-07-13

## Agent Kollari

- State machine, permission, concurrency, idempotency ve stok muhasebesi incelemesi.
- Admin detay UX'i, role gore veri gorunurlugu ve test kapsami incelemesi.
- Order transition integration test uygulamasi.

## Uygulanan Bulgular

- `order.approve` tek basina sevk ve teslim yetkisi vermiyor; review, approve, fulfill, ship, deliver, hold ve cancel ayrildi.
- Depo rolu fiyatlari, muhasebe rolu depo rezervasyonlarini gormuyor.
- `ON_HOLD` serbest bir ileri atlama degil; `heldFromStatus` ile yalniz onceki asamaya donuyor.
- Order `version` CAS stale ekran ve paralel mutation'i engelliyor.
- `OrderTransitionCommand` UUID + request hash ile retry/replay guvenligi sagliyor.
- Iptal ve sevk stock item bazinda gruplanip deterministik sirada isleniyor.
- Iptal/sevk oncesi her kalem icin aktif rezervasyon toplami siparis miktarina esit olmali.
- Kargolu `SHIPPED` gecisinde tasiyici ve takip numarasi zorunlu.
- History aktoru gorunur; audit stok once/sonra degerlerini ve komut anahtarini sakliyor.

## Acik Teknik Borc

- Harici kargo API cagrisi DB transaction icinde yapilmayacak; outbox/worker dilimi bekliyor.
- SQLite icin quantity/reservedQuantity ve reservation quantity DB check constraint'leri eklenmeli.
- PostgreSQL gecisinde global checkout lock yerine sirali row lock/CAS stratejisi hedef DB'de tekrar test edilmeli.
- Admin shell menusu ic roller icin permission-aware filtrelenmeli.
