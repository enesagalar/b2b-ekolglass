# B2B Portal UI Direction

Date: 2026-07-22
Status: Accepted

## Product Boundary

- `www.ekolglass.com` remains the corporate and informational website.
- The corporate website links to this application with a `Bayi Portalı` action.
- This application is a focused B2B sales and operations portal. Corporate pages such as `Hakkımızda` are not part of its primary navigation.
- The deployment target remains an independent portal origin such as `portal.ekolglass.com`.

## Approved Design Direction

The approved reference is the third visual concept set covering the commerce homepage, product detail, order cart, dealer workspace and admin operations center.

The system must feel premium, quiet and precise. Apple is a quality reference for hierarchy, typography, product presentation, materials and motion, not a template to copy.

Rules:

1. Glass material is reserved for navigation, overlays, drawers and transient controls.
2. Product and operational content uses calm solid surfaces with fine separators.
3. Product photography, typography and whitespace carry the visual identity.
4. EkolGlass blue is the primary action color. Green, amber and red are semantic only.
5. Avoid glow, gradient blobs, equal-card dashboard mosaics, nested cards and pill overload.
6. Public commerce, dealer and admin use one token and motion system but different information density.
7. The public header pattern is reused on commerce, catalog, product detail and cart routes where appropriate.
8. Homepage banners remain CMS-managed. Banner editing and preview live under `İçerik ve Bannerlar`, not on the admin dashboard.

## Motion Contract

- Default interaction duration: 160-220 ms.
- Drawers and page-level context transitions: 240-320 ms.
- Motion communicates navigation, selection, confirmation or state change.
- No perpetual decorative motion.
- `prefers-reduced-motion: reduce` disables nonessential transforms and transitions.

## Mobile Contract

- Primary validation widths: 360, 390, 768, 1024 and 1440 CSS pixels.
- No horizontal page overflow.
- Dense tables become purpose-built mobile lists or contained horizontal data regions.
- Drawers fit within the viewport and preserve a visible close control.
- Interactive targets are at least 44 by 44 CSS pixels where practical.
- Sticky actions must not obscure content or browser safe areas.

## Acceptance

Every UI package must pass lint, typecheck, unit/integration tests, production build, responsive visual inspection and keyboard/focus inspection before completion.
