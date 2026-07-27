import { describe, expect, it } from "vitest";

import { getIntegrationPrimaryTask } from "@/domain/integration-operations";

const healthy = {
  dead: 0,
  retry: 0,
  overdue: 0,
  unsupportedReady: 0,
  manualCityShipmentCount: 0,
  systemJobsAlertLevel: "none" as const,
};

describe("integration operations", () => {
  it("prioritizes permanent delivery failures", () => {
    expect(
      getIntegrationPrimaryTask({
        ...healthy,
        dead: 2,
        manualCityShipmentCount: 4,
        systemJobsAlertLevel: "critical",
      }),
    ).toMatchObject({
      tone: "danger",
      href: "/admin/entegrasyonlar?status=DEAD#teslimat-islemleri",
    });
  });

  it("routes scheduler alarms to technical health before manual shipping", () => {
    expect(
      getIntegrationPrimaryTask({
        ...healthy,
        manualCityShipmentCount: 2,
        systemJobsAlertLevel: "warning",
      }),
    ).toMatchObject({ title: "Zamanlanmış işler kontrol edilmeli", href: "#teknik-saglik" });
  });

  it("keeps a healthy system action-free while retaining history access", () => {
    expect(getIntegrationPrimaryTask(healthy)).toMatchObject({
      tone: "success",
      eyebrow: "İşlem gerekmiyor",
    });
  });
});
