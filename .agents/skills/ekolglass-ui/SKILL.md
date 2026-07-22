---
name: ekolglass-ui
description: Apply the approved EkolGlass premium B2B UI system across commerce, dealer and admin routes without changing business rules, authorization or tenant isolation.
---

# EkolGlass UI Skill

Before UI work, read:

1. `AGENTS.md`
2. `codex.md`
3. `docs/decisions/2026-07-22-b2b-portal-ui-direction.md`
4. `docs/ux/ekolglass-ui-system.md`
5. `docs/phases/phase-06-premium-responsive-ui.md`
6. the relevant Next.js 16.2 documentation under `node_modules/next/dist/docs/`

## Non-negotiable Rules

- This application is the B2B sales/operations portal; `www.ekolglass.com` remains the corporate site.
- Do not add corporate-site navigation such as `Hakkımızda` to the B2B primary journey.
- Use glass only for navigation, menus, overlays, drawers and transient controls.
- Keep content surfaces solid, calm and readable.
- Use EkolGlass blue for primary action, not as a full-page theme.
- Preserve all auth, permission, tenant, pricing, stock, order and audit behavior.
- Keep banner editing in `/admin/icerik`; do not place it on `/admin`.
- Use Lucide icons and accessible labels for icon-only actions.
- Honor reduced motion and keyboard focus.
- Validate 360, 390, 768, 1024 and 1440 px widths.

## Workflow

1. Identify the route family and read its data/actions before editing presentation.
2. Reuse design tokens and shared primitives; do not invent route-local palettes.
3. Keep desktop and mobile information hierarchy explicit.
4. Add focused tests when shell behavior, interaction state or conditional navigation changes.
5. Run lint, typecheck, focused tests and build for every package.
6. Update phase/current-state/next-action documents before committing.

## Review Checklist

- No horizontal page overflow.
- No clipped Turkish text or controls.
- No content hidden behind sticky navigation/actions.
- Focus is visible and follows visual order.
- Loading, empty, success, warning and error states remain usable.
- Guest, dealer and admin identities expose only their intended destinations.
- Prices, discounts and stock remain server-derived.
- Mobile drawers close by button, backdrop and navigation.
- Motion explains state; it does not decorate idle screens.
