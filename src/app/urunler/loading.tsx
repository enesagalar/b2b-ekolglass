import { PortalRouteLoading } from "@/components/portal-route-loading";

export default function ProductsLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-8 md:px-6">
      <PortalRouteLoading label="Ürünler hazırlanıyor" />
    </main>
  );
}
