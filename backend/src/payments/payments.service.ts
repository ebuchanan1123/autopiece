import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { SatimPaymentProvider } from "./providers/satim-payment.provider";
import type {
  PaymentAttemptResult,
  PaymentRequest,
  PaymentsGateway,
} from "./payment-provider.types";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly mockProvider: MockPaymentProvider,
    private readonly satimProvider: SatimPaymentProvider,
  ) {}

  async charge(request: PaymentRequest): Promise<PaymentAttemptResult> {
    return this.getProvider().charge(request);
  }

  private getProvider() {
    const gateway = this.resolveGateway();
    return gateway === "satim" ? this.satimProvider : this.mockProvider;
  }

  private resolveGateway(): PaymentsGateway {
    const configured = (this.config.get<string>("PAYMENTS_PROVIDER") ?? "mock")
      .trim()
      .toLowerCase();

    return configured === "satim" ? "satim" : "mock";
  }
}
