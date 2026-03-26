import type { PaymentProvider, PaymentStatus } from "../orders/payment.entity";

export type CheckoutMethod = "saved_card" | "apple_pay" | "paypal";
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
  rawPayload?: Record<string, unknown> | null;
};
