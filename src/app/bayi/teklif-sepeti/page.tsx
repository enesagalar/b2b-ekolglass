import { permanentRedirect } from "next/navigation";

export default function LegacyQuoteCartPage() {
  permanentRedirect("/urunler");
}
