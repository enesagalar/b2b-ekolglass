import "server-only";

import nodemailer from "nodemailer";

import { PermanentOutboxError } from "@/integrations/outbox";

import { getEmailConfig } from "./config";
import type { EmailProvider } from "./types";

export function createSmtpEmailProvider(): EmailProvider {
  const config = getEmailConfig();
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    auth: config.user
      ? { user: config.user, pass: config.password }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    dnsTimeout: 10_000,
  });

  return {
    async send(message) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          transport.sendMail({
            from: config.from,
            to: message.to.name
              ? { address: message.to.email, name: message.to.name }
              : message.to.email,
            subject: message.subject,
            text: message.text,
            html: message.html,
            messageId: message.messageId,
          }),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => {
              transport.close();
              reject(new Error("SMTP mutlak teslim süresi aşıldı."));
            }, 30_000);
          }),
        ]);
        if (result.accepted.length === 0) {
          throw new PermanentOutboxError("SMTP sağlayıcısı alıcıyı kabul etmedi.");
        }
        return {
          messageId: result.messageId,
          acceptedCount: result.accepted.length,
          rejectedCount: result.rejected.length,
        };
      } catch (error) {
        if (error instanceof PermanentOutboxError) throw error;
        const responseCode =
          typeof error === "object" && error && "responseCode" in error
            ? Number(error.responseCode)
            : 0;
        if (responseCode >= 500 && responseCode < 600) {
          throw new PermanentOutboxError("SMTP sağlayıcısı teslimi kalıcı olarak reddetti.");
        }
        throw new Error("SMTP sağlayıcısına geçici olarak ulaşılamadı.");
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    },
  };
}
