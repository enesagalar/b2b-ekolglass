import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { enqueueIntegrationEvent, processOutboxBatch } from "@/integrations/outbox";
import { deriveActivationToken, hashActivationToken } from "@/lib/activation-token";
import { prisma } from "@/lib/prisma";

import { createEmailHandlers } from "./handlers";
import type { EmailProvider, TransactionalEmail } from "./types";

const prefix = `email-handler-test-${randomUUID()}`;
const createdEventIds: string[] = [];
let companyId: string | undefined;
let userId: string | undefined;

beforeEach(() => {
  process.env.EMAIL_PROVIDER = "smtp";
  process.env.EMAIL_FROM = "EkolGlass Test <test@ekolglass.local>";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_PORT = "2525";
  process.env.SMTP_SECURE = "false";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  process.env.OUTBOX_CRON_SECRET = "email-handler-test-outbox-secret-0000001";
});

afterEach(async () => {
  await prisma.integrationLog.deleteMany({ where: { outboxEventId: { in: createdEventIds } } });
  await prisma.integrationOutboxEvent.deleteMany({ where: { id: { in: createdEventIds } } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  if (companyId) await prisma.company.deleteMany({ where: { id: companyId } });
  createdEventIds.length = 0;
  companyId = undefined;
  userId = undefined;
  process.env.EMAIL_PROVIDER = "disabled";
  delete process.env.OUTBOX_CRON_SECRET;
});

describe("transactional email handlers", () => {
  it("delivers activation without persisting the plaintext token", async () => {
    const company = await prisma.company.create({
      data: {
        legalName: `${prefix} Company`,
        displayName: `${prefix} Company`,
        email: `${prefix}@example.com`,
        phone: "+90 555 000 00 00",
        city: "İstanbul",
        status: "APPROVED",
      },
    });
    companyId = company.id;
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-user@example.com`,
        name: "Test Bayi",
        role: "DEALER_OWNER",
        status: "INVITED",
        companyId: company.id,
      },
    });
    userId = user.id;
    const tokenId = randomUUID();
    const rawToken = deriveActivationToken(tokenId);
    const event = await prisma.$transaction(async (tx) => {
      await tx.userActivationToken.create({
        data: {
          id: tokenId,
          userId: user.id,
          tokenHash: hashActivationToken(rawToken),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return enqueueIntegrationEvent(tx, {
        topic: "credential.activation_requested.v1",
        eventType: "USER_ACTIVATION_REQUESTED",
        aggregateType: "UserActivationToken",
        aggregateId: tokenId,
        payload: { schemaVersion: 1, tokenId, userId: user.id },
        idempotencyKey: `${prefix}:activation`,
      });
    });
    createdEventIds.push(event.id);

    const sent: TransactionalEmail[] = [];
    const provider: EmailProvider = {
      async send(message) {
        sent.push(message);
        return { messageId: message.messageId, acceptedCount: 1, rejectedCount: 0 };
      },
    };
    expect(event.payload).not.toContain(rawToken);
    expect(event.payload).not.toContain(user.email);

    expect(
      await processOutboxBatch(createEmailHandlers(provider), {
        workerId: "email-handler-test",
        limit: 1,
      }),
    ).toEqual([{ eventId: event.id, status: "SUCCEEDED" }]);
    expect(sent).toHaveLength(1);
    expect(sent[0].to.email).toBe(user.email);
    expect(sent[0].text).toContain(`/aktivasyon/${rawToken}`);
  });
});
