import { afterEach, describe, expect, it, vi } from "vitest";

import { CityLogisticsAdapter } from "./city-logistics";
import { getCityLogisticsReadiness } from "./city-logistics-readiness";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CityLogisticsAdapter", () => {
  it("does not create shipments while the verified API is disabled", async () => {
    const adapter = new CityLogisticsAdapter({ enabled: false });

    await expect(
      adapter.createShipment({
        orderNumber: "ORD-1",
        sender: {
          companyName: "EkolGlass",
          contactName: "Operasyon",
          phone: "+90 212 000 00 00",
          city: "İstanbul",
          line1: "Tuzla",
        },
        recipient: {
          companyName: "Bayi",
          contactName: "Satın Alma",
          phone: "+90 212 111 11 11",
          city: "İstanbul",
          line1: "İkitelli",
        },
        parcels: [{ quantity: 1, description: "Otomotiv camı" }],
      }),
    ).rejects.toThrow("adapter pasif");
  });

  it("requires credentials before live API operations", async () => {
    const adapter = new CityLogisticsAdapter({ enabled: true });

    await expect(adapter.getTrackingStatus("TRACK-1")).rejects.toThrow("konfigurasyonu eksik");
  });

  it("keeps network dispatch locked even when placeholder configuration is complete", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new CityLogisticsAdapter({
      enabled: true,
      baseUrl: "https://sandbox.example.test",
      apiKey: "secret-value",
      accountNumber: "EKOL-1",
      contractVersion: "pending-review-v1",
    });

    await expect(adapter.getTrackingStatus("TRACK-1")).rejects.toThrow(
      "doğrulanmış sözleşme uygulanmadığı için kilitli",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports activation gates without exposing secret values", () => {
    const readiness = getCityLogisticsReadiness({
      CITY_LOJISTIK_ENABLED: "true",
      CITY_LOJISTIK_API_BASE_URL: "http://insecure.example.test",
      CITY_LOJISTIK_API_KEY: "super-secret-api-key",
      CITY_LOJISTIK_ACCOUNT_NUMBER: "EKOL-1",
    });

    expect(readiness).toMatchObject({
      status: "blocked",
      canDispatch: false,
      configured: false,
    });
    expect(readiness.checks.find((check) => check.key === "endpoint")?.status).toBe("missing");
    expect(JSON.stringify(readiness)).not.toContain("super-secret-api-key");
  });
});
