import { createCityLogisticsAdapterFromEnv } from "./city-logistics";
import type { ShippingProviderAdapter } from "./types";

export function getShippingProviderAdapter(providerCode: string): ShippingProviderAdapter {
  switch (providerCode) {
    case "CITY_LOJISTIK":
      return createCityLogisticsAdapterFromEnv();
    default:
      throw new Error(`Desteklenmeyen kargo sağlayıcısı: ${providerCode}`);
  }
}
