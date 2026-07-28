import { describe, expect, it } from "vitest";

import {
  getAdminOrderQueueStatuses,
  getAdminOrderTask,
  resolveAdminOrderQueueScope,
} from "./admin-order-queue";

describe("admin order queue", () => {
  it("maps every non-draft status into an operational queue", () => {
    expect(resolveAdminOrderQueueScope("READY_TO_SHIP")).toBe("READY_TO_SHIP");
    expect(resolveAdminOrderQueueScope("FORGED")).toBe("ALL");
    expect(getAdminOrderQueueStatuses("ALL")).not.toContain("DRAFT");
    expect(getAdminOrderQueueStatuses("REVIEW")).toEqual([
      "SUBMITTED",
      "WAITING_FOR_APPROVAL",
    ]);
    expect(getAdminOrderQueueStatuses("BLOCKED")).toEqual(["ON_HOLD"]);
    expect(getAdminOrderQueueStatuses("READY_TO_SHIP")).toEqual([
      "READY_FOR_SHIPMENT",
    ]);
  });

  it("describes the next internal operation without changing the state machine", () => {
    expect(getAdminOrderTask("WAITING_FOR_APPROVAL")).toMatchObject({
      title: "Ticari kararı ver",
      tone: "warning",
    });
    expect(getAdminOrderTask("DELIVERED")).toMatchObject({
      title: "Operasyon tamamlandı",
      tone: "success",
    });
  });

  it("makes the manual City task explicit only for ready shipments", () => {
    expect(getAdminOrderTask("READY_FOR_SHIPMENT", true)).toMatchObject({
      title: "Manuel sevkiyatı tamamla",
      tone: "warning",
    });
    expect(getAdminOrderTask("SHIPPED", true).title).toBe("Teslimatı izle");
  });
});
