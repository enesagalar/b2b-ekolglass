export type TransactionalEmail = {
  to: { email: string; name?: string | null };
  subject: string;
  text: string;
  html: string;
  messageId: string;
};

export type EmailDeliveryResult = {
  messageId: string;
  acceptedCount: number;
  rejectedCount: number;
};

export interface EmailProvider {
  send(message: TransactionalEmail): Promise<EmailDeliveryResult>;
}
