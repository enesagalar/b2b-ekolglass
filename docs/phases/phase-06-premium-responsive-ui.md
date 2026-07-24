# Faz 6 - Premium Responsive UI System

Status: Superseded by Faz 7 remediation
Decision reference: `docs/decisions/2026-07-22-b2b-portal-ui-direction.md`
System reference: `docs/ux/ekolglass-ui-system.md`

## Package 1 - Foundation

- Brand assets and canonical logo component.
- Color, typography, surface, focus and motion tokens.
- Reduced-motion and mobile-safe global behavior.
- Shared public navigation and portal shell foundations.

Exit: shared primitives compile, retain auth/permission behavior and pass focused tests.

## Package 2 - Commerce Journey

- B2B sales homepage without corporate-site navigation.
- Catalog/product list.
- Product detail.
- Order cart and checkout review.
- Login, application, activation and password recovery consistency.

Exit: guest and dealer journeys work at 360-1440 px with no horizontal overflow.

## Package 3 - Dealer Workspace

- Dealer shell and overview.
- Orders list/detail.
- Historical quote archive.
- Company account and addresses.

Exit: tenant isolation remains unchanged and dense views have explicit mobile layouts.

## Package 4 - Admin Operations

- Admin shell and command hierarchy.
- Dashboard without banner/CMS preview.
- Dealer, company, catalog, publishing, pricing, order, report, CMS and integration pages.
- Banner management remains in `İçerik ve Bannerlar`.

Exit: permission-aware navigation and all mutation workflows remain intact.

## Package 5 - Motion, Accessibility and Visual QA

- Purposeful micro-interactions and drawers.
- Keyboard/focus and reduced-motion verification.
- Responsive screenshots at 360, 390, 768, 1024 and 1440.
- Full `npm run check` and role-based smoke tests.

Exit: no known clipping, overflow, inaccessible focus, role crossover or visual regressions.

## Progress Protocol

At the end of each package update:

- `docs/02-current-state.md`
- `docs/04-next-actions.md`
- this phase file
- tests executed and their results
- commit and push evidence

## Completion Evidence - 2026-07-22

- Package 1: canonical brand assets, shared logo, visual tokens, reduced-motion behavior, commerce header and portal shells completed.
- Package 2: B2B homepage, catalog, product detail, cart, dealer application and credential screens completed.
- Package 3: dealer navigation and overview completed; existing tenant-scoped order, quote archive and company workflows inherit the responsive portal workspace.
- Package 4: admin navigation and dashboard completed; CMS/banner controls remain exclusively under `Icerik ve Bannerlar` and support local file upload.
- Package 5: browser overflow checks passed at 360, 390, 768, 1024 and 1440 px. Mobile commerce menu and admin dense-route containment were verified.
- Quality gates: lint, typecheck, 19 Node tests, 377 Vitest tests and the Next.js production build passed.
- The database release integration test received a scenario-local 30 second timeout because backup verification took 9 seconds on Windows; assertions and behavior were not weakened.

## Post-Acceptance Finding - 2026-07-24

The original acceptance missed blurred raster branding, nested admin active-route ambiguity, incomplete drawer accessibility and weak glass material behavior. These findings are tracked and revalidated under `phase-07-ui-remediation-and-release-acceptance.md`; Faz 6 evidence must not be used as the current UI release decision.
