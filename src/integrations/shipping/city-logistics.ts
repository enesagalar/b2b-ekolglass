import type {
  CreateShipmentResult,
  ShippingProviderAdapter,
  TrackingStatusResult,
} from "./types";

export type CityLogisticsConfig = {
  baseUrl?: string;
  apiKey?: string;
  accountNumber?: string;
  enabled: boolean;
};

export class CityLogisticsAdapter implements ShippingProviderAdapter {
  readonly code = "CITY_LOJISTIK";
  readonly name = "City Lojistik";
  readonly capabilities = {
    labels: false,
    webhooks: false,
    priceCalculation: false,
  };

  constructor(private readonly config: CityLogisticsConfig) {}

  async createShipment(): Promise<CreateShipmentResult> {
    this.assertReady();
    throw new Error("City Lojistik canlı gönderi endpointi henüz doğrulanmadı.");
  }

  async cancelShipment(): Promise<void> {
    this.assertReady();
    throw new Error("City Lojistik iptal endpointi henüz doğrulanmadı.");
  }

  async getTrackingStatus(): Promise<TrackingStatusResult> {
    this.assertReady();
    throw new Error("City Lojistik takip endpointi henüz doğrulanmadı.");
  }

  async printLabel(): Promise<{ labelUrl: string }> {
    this.assertReady();
    throw new Error("City Lojistik etiket endpointi henüz doğrulanmadı.");
  }

  private assertReady() {
    if (!this.config.enabled) {
      throw new Error("City Lojistik adapter pasif. Canlı API bilgileri doğrulanmadan gönderi oluşturulamaz.");
    }

    if (!this.config.baseUrl || !this.config.apiKey || !this.config.accountNumber) {
      throw new Error("City Lojistik adapter için baseUrl, apiKey ve accountNumber gereklidir.");
    }
  }
}

export function createCityLogisticsAdapterFromEnv() {
  return new CityLogisticsAdapter({
    baseUrl: process.env.CITY_LOJISTIK_API_BASE_URL,
    apiKey: process.env.CITY_LOJISTIK_API_KEY,
    accountNumber: process.env.CITY_LOJISTIK_ACCOUNT_NUMBER,
    enabled: process.env.CITY_LOJISTIK_ENABLED === "true",
  });
}
