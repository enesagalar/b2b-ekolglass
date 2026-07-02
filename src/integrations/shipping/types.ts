export type ShipmentAddress = {
  companyName: string;
  contactName: string;
  phone: string;
  city: string;
  district?: string;
  line1: string;
  postalCode?: string;
  country?: string;
};

export type ShipmentParcel = {
  quantity: number;
  weightKg?: number;
  widthCm?: number;
  heightCm?: number;
  lengthCm?: number;
  description?: string;
};

export type CreateShipmentInput = {
  orderNumber: string;
  referenceNumber?: string;
  sender: ShipmentAddress;
  recipient: ShipmentAddress;
  parcels: ShipmentParcel[];
  notes?: string;
};

export type CreateShipmentResult = {
  providerCode: string;
  externalShipmentId: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  rawStatus?: string;
};

export type TrackingEvent = {
  eventCode: string;
  title: string;
  description?: string;
  occurredAt: Date;
  location?: string;
  rawPayload?: unknown;
};

export type TrackingStatusResult = {
  providerCode: string;
  trackingNumber: string;
  status: string;
  rawStatus?: string;
  events: TrackingEvent[];
};

export type ShippingProviderCapabilities = {
  labels: boolean;
  webhooks: boolean;
  priceCalculation: boolean;
};

export interface ShippingProviderAdapter {
  readonly code: string;
  readonly name: string;
  readonly capabilities: ShippingProviderCapabilities;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  cancelShipment(externalShipmentId: string): Promise<void>;
  getTrackingStatus(trackingNumber: string): Promise<TrackingStatusResult>;
  printLabel(externalShipmentId: string): Promise<{ labelUrl: string }>;
}
