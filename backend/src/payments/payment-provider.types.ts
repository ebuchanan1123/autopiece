import type { PaymentProvider, PaymentStatus } from "../orders/payment.entity";

export type CheckoutMethod = "saved_card";
export type PaymentsGateway = "mock" | "satim";

export type PaymentRequest = {
  amountDzd: number;
  orderId: number;
  orderNumber: string;
  requestedMethod?: CheckoutMethod;
  paymentCardLast4?: string | null;
};

export type PaymentAttemptResult = {
  provider: PaymentProvider;
  status: PaymentStatus;
  providerPaymentId?: string | null;
  checkoutUrl?: string | null;
  rawPayload?: Record<string, unknown> | null;
};
