import type {
  CreateShipmentInput,
  CreateShipmentResult,
  ShippingProviderAdapter,
  TrackingStatusResult,
} from "./types";
import { getCityLogisticsReadiness } from "./city-logistics-readiness";

export type CityLogisticsConfig = {
  baseUrl?: string;
  apiKey?: string;
  accountNumber?: string;
  contractVersion?: string;
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

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void _input;
    this.assertReady();
    throw new Error("City Lojistik canlı gönderi endpointi henüz doğrulanmadı.");
  }

  async cancelShipment(_externalShipmentId: string): Promise<void> {
    void _externalShipmentId;
    this.assertReady();
    throw new Error("City Lojistik iptal endpointi henüz doğrulanmadı.");
  }

  async getTrackingStatus(_trackingNumber: string): Promise<TrackingStatusResult> {
    void _trackingNumber;
    this.assertReady();
    throw new Error("City Lojistik takip endpointi henüz doğrulanmadı.");
  }

  async printLabel(_externalShipmentId: string): Promise<{ labelUrl: string }> {
    void _externalShipmentId;
    this.assertReady();
    throw new Error("City Lojistik etiket endpointi henüz doğrulanmadı.");
  }

  private assertReady() {
    const readiness = getCityLogisticsReadiness({
      CITY_LOJISTIK_ENABLED: String(this.config.enabled),
      CITY_LOJISTIK_API_BASE_URL: this.config.baseUrl,
      CITY_LOJISTIK_API_KEY: this.config.apiKey,
      CITY_LOJISTIK_ACCOUNT_NUMBER: this.config.accountNumber,
      CITY_LOJISTIK_CONTRACT_VERSION: this.config.contractVersion,
    });
    if (!readiness.enabled) {
      throw new Error("City Lojistik adapter pasif. Canlı API bilgileri doğrulanmadan gönderi oluşturulamaz.");
    }

    const missing = readiness.checks
      .filter((check) => check.status === "missing" && check.key !== "activation")
      .map((check) => check.label);
    if (missing.length) {
      throw new Error(`City Lojistik adapter konfigurasyonu eksik: ${missing.join(", ")}.`);
    }

    throw new Error("City Lojistik canlı adapteri, doğrulanmış sözleşme uygulanmadığı için kilitli.");
  }
}

export function createCityLogisticsAdapterFromEnv() {
  return new CityLogisticsAdapter({
    baseUrl: process.env.CITY_LOJISTIK_API_BASE_URL,
    apiKey: process.env.CITY_LOJISTIK_API_KEY,
    accountNumber: process.env.CITY_LOJISTIK_ACCOUNT_NUMBER,
    contractVersion: process.env.CITY_LOJISTIK_CONTRACT_VERSION,
    enabled: process.env.CITY_LOJISTIK_ENABLED === "true",
  });
}
