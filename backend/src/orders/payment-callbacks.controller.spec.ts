import { UnauthorizedException } from "@nestjs/common";
import { PaymentCallbacksController } from "./payment-callbacks.controller";

describe("PaymentCallbacksController", () => {
  const ordersService = {
    handlePaymentProviderCallback: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unverified SATIM callbacks", async () => {
    ordersService.handlePaymentProviderCallback.mockResolvedValue({
      ok: false,
      verified: false,
    });
    const controller = new PaymentCallbacksController(ordersService as any);

    await expect(controller.satimCallback({}, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("returns verified SATIM callback results", async () => {
    const result = {
      ok: true,
      verified: true,
      processed: true,
      duplicate: false,
    };
    ordersService.handlePaymentProviderCallback.mockResolvedValue(result);
    const controller = new PaymentCallbacksController(ordersService as any);

    await expect(
      controller.satimCallback({ eventId: "evt_1" }, { "x-signature": "sig" }),
    ).resolves.toEqual(result);
    expect(ordersService.handlePaymentProviderCallback).toHaveBeenCalledWith(
      "satim",
      { eventId: "evt_1" },
      { "x-signature": "sig" },
    );
  });
});
