import { Injectable } from "@nestjs/common";
import type { PaymentProviderAdapter } from "../payment-provider.interface";
import type {
  CheckoutMethod,
  PaymentAttemptResult,
  PaymentRequest,
} from "../payment-provider.types";

@Injectable()
export class MockPaymentProvider implements PaymentProviderAdapter {
  readonly gateway = "mock" as const;

  charge(request: PaymentRequest): Promise<PaymentAttemptResult> {
    return Promise.resolve({
      provider: this.mapRequestedMethod(request.requestedMethod),
      status: "success",
      providerPaymentId: `mock_${request.orderNumber}_${Date.now()}`,
      checkoutUrl: null,
      rawPayload: {
        gateway: this.gateway,
        selectedMethod: request.requestedMethod ?? "saved_card",
        cardLast4: request.paymentCardLast4 ?? null,
        simulated: true,
      },
    });
  }

  private mapRequestedMethod(method?: CheckoutMethod) {
    return "satim" as const;
  }
}
