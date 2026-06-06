import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentsService } from "./payments.service";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { SatimPaymentProvider } from "./providers/satim-payment.provider";

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, MockPaymentProvider, SatimPaymentProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
