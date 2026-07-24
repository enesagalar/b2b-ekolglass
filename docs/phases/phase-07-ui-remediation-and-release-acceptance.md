# Faz 7 - UI Remediation and Release Acceptance

Status: Local acceptance complete; production acceptance blocked by external inputs
Started: 2026-07-24

## Objective

Close the visual, navigation, perceived-performance and end-to-end release gaps discovered after Faz 6. Business rules, authorization, tenant isolation, pricing and stock semantics remain unchanged.

## Package 1 - Brand and Navigation Remediation

- Replace the cropped JPEG/ICO brand path with vector assets derived from the approved logo PDF.
- Use one glass material language for commerce navigation, portal top bars and mobile drawers.
- Keep operational content on calm solid surfaces.
- Fix exact active-route selection for nested admin routes.
- Replace uncontrolled mobile menus with an accessible drawer supporting backdrop close, Escape, focus containment, focus return and body scroll lock.
- Use the full sidebar only at `xl`; use the drawer at 1024 px.

Status: Implemented and locally accepted.

## Package 2 - Commerce and Dealer Presence

- Optimize the CMS hero through `next/image` instead of a raw CSS background transfer.
- Strengthen the dealer overview with a commercial command band, integrated KPIs and account context.
- Retain the B2B sales focus; do not add corporate-site pages.
- Continue removing nested-card patterns from high-use catalog, price, order and stock routes.

Status: Core surfaces implemented; dense secondary-route cleanup remains.

## Package 3 - Repeatable Release Demo

- Add an isolated integration scenario covering:
  - dealer cart and server-derived price snapshot,
  - order submission,
  - stock reservation without premature physical decrement,
  - approval, preparation, production and shipment lifecycle,
  - physical stock decrement at shipment,
  - no second decrement at delivery,
  - reservation consumption,
  - history, audit and append-only stock movements,
  - outbox processing and eight transactional email messages.

Command:

```powershell
npm run demo:release
```

Status: Implemented and passing locally.

## Package 4 - Release Gates

- Responsive browser checks at 360, 390, 768, 1024 and 1440 px.
- Keyboard, focus, Escape, drawer and horizontal-overflow checks.
- Full lint, typecheck, Node tests, Vitest suite and production build.
- Authenticated staging smoke against an isolated database.
- Production SMTP inbox proof.
- Hosting, DNS/TLS, persistent database/media, scheduler, backup/restore and monitoring evidence.

Status: Local quality gates passed. External production acceptance is blocked by environment and credential inputs.

Local evidence:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Node tests: 19/19 passed.
- Vitest: 84 files, 380/380 tests passed.
- `npm run demo:release`: 1/1 lifecycle scenario passed.
- Authenticated isolated smoke: 44/44 checks passed.
- `npm run build`: passed on Next.js 16.2.11.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.

## External Inputs Required for GO

- Final portal hostname and target hosting platform.
- Verified SMTP account and sender domain with SPF, DKIM and DMARC.
- Persistent SQLite volume or approved database target.
- S3/R2 media bucket and separate offsite backup destination.
- Scheduler and alert receiver configuration.
- City Lojistik remains disabled until the official API contract and test account arrive.

## Acceptance Rule

Faz 7 cannot be marked complete from screenshots alone. The local quality gate, isolated lifecycle demo, authenticated staging smoke and external production evidence must all be recorded.
