import "server-only";

import { z } from "zod";

import { getStatusLabel } from "@/domain/statuses";
import { PermanentOutboxError, type OutboxHandlerRegistry } from "@/integrations/outbox";
import { deriveActivationToken, hashActivationToken } from "@/lib/activation-token";
import { derivePasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset-token";
import { prisma } from "@/lib/prisma";

import { getEmailConfig } from "./config";
import { createSmtpEmailProvider } from "./smtp-provider";
import { commerceTemplate, credentialTemplate } from "./templates";
import type { EmailProvider } from "./types";

const credentialPayload = z.object({
  schemaVersion: z.literal(1),
  tokenId: z.string().min(1),
  userId: z.string().min(1),
});
const orderPayload = z.object({ orderId: z.string().min(1) }).passthrough();
const orderStatusPayload = orderPayload.extend({ toStatus: z.string().min(1) });
const quotePayload = z.object({ quoteId: z.string().min(1) }).passthrough();
const quoteStatusPayload = quotePayload.extend({ toStatus: z.string().min(1) });

function parse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) throw new PermanentOutboxError("E-posta olay payload sözleşmesi geçersiz.");
  return result.data;
}

function messageId(eventId: string) {
  return `<${eventId}@b2b.ekolglass.com>`;
}

export function createEmailHandlers(provider: EmailProvider = createSmtpEmailProvider()): OutboxHandlerRegistry {
  const { siteUrl } = getEmailConfig();

  async function activation(payload: unknown, context: { eventId: string }) {
    const data = parse(credentialPayload, payload);
    const token = await prisma.userActivationToken.findUnique({
      where: { id: data.tokenId },
      include: { user: { include: { company: { select: { status: true } } } } },
    });
    const rawToken = deriveActivationToken(data.tokenId);
    if (!token || token.userId !== data.userId || token.tokenHash !== hashActivationToken(rawToken) || token.consumedAt || token.revokedAt || token.expiresAt <= new Date() || token.user.status !== "INVITED" || !["DEALER_OWNER", "DEALER_STAFF"].includes(token.user.role) || token.user.company?.status !== "APPROVED") {
      throw new PermanentOutboxError("Aktivasyon daveti artık teslim edilebilir durumda değil.");
    }
    const content = credentialTemplate({ kind: "activation", name: token.user.name, url: `${siteUrl}/aktivasyon/${rawToken}`, expiresAt: token.expiresAt });
    return provider.send({ to: { email: token.user.email, name: token.user.name }, ...content, messageId: messageId(context.eventId) });
  }

  async function passwordReset(payload: unknown, context: { eventId: string }) {
    const data = parse(credentialPayload, payload);
    const token = await prisma.userPasswordResetToken.findUnique({
      where: { id: data.tokenId },
      include: { user: { include: { company: { select: { status: true } } } } },
    });
    const rawToken = derivePasswordResetToken(data.tokenId);
    if (!token || token.userId !== data.userId || token.tokenHash !== hashPasswordResetToken(rawToken) || token.consumedAt || token.revokedAt || token.expiresAt <= new Date() || token.user.status !== "ACTIVE" || !["DEALER_OWNER", "DEALER_STAFF"].includes(token.user.role) || token.user.company?.status !== "APPROVED") {
      throw new PermanentOutboxError("Parola sıfırlama daveti artık teslim edilebilir durumda değil.");
    }
    const content = credentialTemplate({ kind: "password-reset", name: token.user.name, url: `${siteUrl}/parola-sifirla/${rawToken}`, expiresAt: token.expiresAt });
    return provider.send({ to: { email: token.user.email, name: token.user.name }, ...content, messageId: messageId(context.eventId) });
  }

  async function order(payload: unknown, context: { eventId: string }, submitted: boolean) {
    const data = parse(submitted ? orderPayload : orderStatusPayload, payload);
    const record = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { createdBy: { include: { company: { select: { status: true } } } } },
    });
    if (!record?.createdBy || record.createdBy.status !== "ACTIVE" || !["DEALER_OWNER", "DEALER_STAFF"].includes(record.createdBy.role) || record.createdBy.companyId !== record.companyId || record.createdBy.company?.status !== "APPROVED") {
      throw new PermanentOutboxError("Sipariş bildirimi için aktif firma alıcısı bulunamadı.");
    }
    const status = submitted ? record.status : (data as z.infer<typeof orderStatusPayload>).toStatus;
    const content = commerceTemplate({ kind: "order", name: record.createdBy.name, reference: record.orderNumber, statusLabel: getStatusLabel(status), url: `${siteUrl}/bayi/siparisler/${record.id}`, submitted });
    return provider.send({ to: { email: record.createdBy.email, name: record.createdBy.name }, ...content, messageId: messageId(context.eventId) });
  }

  async function quote(payload: unknown, context: { eventId: string }, submitted: boolean) {
    const data = parse(submitted ? quotePayload : quoteStatusPayload, payload);
    const record = await prisma.quoteRequest.findUnique({
      where: { id: data.quoteId },
      include: { requester: { include: { company: { select: { status: true } } } } },
    });
    if (!record?.requester || record.requester.status !== "ACTIVE" || !["DEALER_OWNER", "DEALER_STAFF"].includes(record.requester.role) || record.requester.companyId !== record.companyId || record.requester.company?.status !== "APPROVED") {
      throw new PermanentOutboxError("Teklif bildirimi için aktif firma alıcısı bulunamadı.");
    }
    const status = submitted ? record.status : (data as z.infer<typeof quoteStatusPayload>).toStatus;
    const content = commerceTemplate({ kind: "quote", name: record.requesterName, reference: record.quoteNumber, statusLabel: getStatusLabel(status), url: `${siteUrl}/bayi/teklifler/${record.id}`, submitted });
    return provider.send({ to: { email: record.requester.email, name: record.requester.name }, ...content, messageId: messageId(context.eventId) });
  }

  return {
    "credential.activation_requested.v1": activation,
    "credential.password_reset_requested.v1": passwordReset,
    "commerce.order.submitted.v1": (payload, context) => order(payload, context, true),
    "commerce.order.status_changed.v1": (payload, context) => order(payload, context, false),
    "commerce.quote.submitted.v1": (payload, context) => quote(payload, context, true),
    "commerce.quote.status_changed.v1": (payload, context) => quote(payload, context, false),
  };
}
