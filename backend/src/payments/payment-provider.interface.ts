import type {
  PaymentAttemptResult,
  PaymentRequest,
  PaymentsGateway,
} from "./payment-provider.types";

export interface PaymentProviderAdapter {
  readonly gateway: PaymentsGateway;
  charge(request: PaymentRequest): Promise<PaymentAttemptResult>;
}
