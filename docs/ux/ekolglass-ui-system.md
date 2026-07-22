# EkolGlass B2B UI System

## Experience Principles

- Sales first: finding the correct glass and creating an order are the shortest paths.
- Operational clarity: status, stock, price and next action are visible without decorative noise.
- Layer discipline: navigation may float; content stays grounded.
- Progressive density: public commerce is editorial, dealer screens are task-oriented, admin screens are information-dense.
- One source of truth: shared tokens, brand components, status language and interaction timing.

## Route Families

### Commerce

- `/`: B2B product discovery, search, categories and featured products.
- `/urunler`, `/katalog`: search, filter, compare and price/stock visibility.
- `/urunler/[id]`: product media, compatibility, technical data, price and direct order action.
- `/sepet`: stock/price verification, address, terms and order submission.
- `/giris`, `/bayi-basvurusu`, activation and password routes: focused credential flows.

### Dealer

- `/bayi`: company overview, recent orders, commercial terms and quick reorder.
- `/bayi/siparisler`, `/bayi/siparisler/[id]`: order list, status and shipment detail.
- `/bayi/teklifler`, `/bayi/teklifler/[id]`: read-only historical quote archive.
- `/bayi/hesabim`: users, addresses and commercial account facts.

### Admin

- `/admin`: operations, pending actions, stock risk and system health. No CMS banner module.
- Dealer, company, product, publishing, pricing, order, report, CMS and integration routes retain permission-aware navigation.
- `/admin/icerik`: homepage copy, banner preview, upload and lifecycle management.

## Visual Tokens

- Canvas: mineral white and neutral gray.
- Ink: near-black graphite; secondary text uses neutral gray.
- Brand: EkolGlass blue, with darker pressed state and pale selection wash.
- Borders: neutral silver hairlines.
- Radius: 6-8 px for content controls; navigation material may use 12-16 px when floating.
- Shadows: subtle elevation only for navigation, drawers, menus and active overlays.
- Typography: Geist with Turkish Latin extensions; regular, medium and semibold weights.

## Component Boundaries

- `BrandLogo`: canonical logo/icon presentation.
- `CommerceHeader`: responsive B2B navigation, search, account and cart.
- `CommerceFooter`: product/account/support links only.
- `PortalSidebar`: shared behavioral model for dealer/admin, separate permission data.
- `PortalTopbar`: page title, command/search, identity and mobile navigation.
- `StatusText`: semantic dot + text; badges only when compact scanning requires them.
- `DataTable`: desktop table plus explicit mobile representation.
- `ContextDrawer`: order, product or CMS inspector.
- `ProductMedia`: stable aspect ratio, thumbnails, zoom and fallbacks.

## Motion Tokens

- `--motion-fast`: 160 ms.
- `--motion-base`: 220 ms.
- `--motion-slow`: 300 ms.
- Standard easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Hover translation is limited to 1-2 px and only for interactive media/actions.
- Route and drawer transitions preserve spatial origin.

## Responsive Rules

- Public max content width: 1440 px.
- Portal max content width: 1520 px.
- Public navigation condenses to logo, search, cart/account and a mobile menu.
- Dealer/admin sidebars become modal drawers below desktop.
- Product detail stacks media before purchase data on narrow screens.
- Cart summary becomes a normal flow section on mobile; checkout action may become sticky only with safe-area padding.
- Admin data tables expose priority columns first and never shrink text below legibility.
