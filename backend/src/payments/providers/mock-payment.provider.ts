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
      rawPayload: {
        gateway: this.gateway,
        selectedMethod: request.requestedMethod ?? "saved_card",
        cardLast4: request.paymentCardLast4 ?? null,
        simulated: true,
      },
    });
  }

  private mapRequestedMethod(method?: CheckoutMethod) {
    if (method === "apple_pay") return "apple_pay" as const;
    if (method === "paypal") return "paypal" as const;
    return "satim" as const;
  }
}
