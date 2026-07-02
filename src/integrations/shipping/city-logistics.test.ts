import { describe, expect, it } from "vitest";

import { CityLogisticsAdapter } from "./city-logistics";

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

    await expect(adapter.getTrackingStatus("TRACK-1")).rejects.toThrow("baseUrl, apiKey ve accountNumber");
  });
});
