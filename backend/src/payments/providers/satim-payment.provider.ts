import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentProviderAdapter } from "../payment-provider.interface";
import type {
  PaymentAttemptResult,
  PaymentRequest,
} from "../payment-provider.types";

@Injectable()
export class SatimPaymentProvider implements PaymentProviderAdapter {
  readonly gateway = "satim" as const;

  constructor(private readonly config: ConfigService) {}

  charge(request: PaymentRequest): Promise<PaymentAttemptResult> {
    const merchantId = this.config.get<string>("SATIM_MERCHANT_ID");
    const terminalId = this.config.get<string>("SATIM_TERMINAL_ID");
    const apiKey = this.config.get<string>("SATIM_API_KEY");

    if (!merchantId || !terminalId || !apiKey) {
      return Promise.reject(new ServiceUnavailableException(
        "SATIM checkout is not configured yet. Keep PAYMENTS_PROVIDER=mock until live credentials and the SATIM request signing flow are implemented.",
      ));
    }

    return Promise.reject(new ServiceUnavailableException(
      `SATIM checkout is not wired yet for order ${request.orderNumber}. The provider layer is ready, but the signed request/redirect flow still needs to be implemented.`,
    ));
  }
}
