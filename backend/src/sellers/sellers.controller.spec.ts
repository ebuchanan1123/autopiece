import { Test, TestingModule } from "@nestjs/testing";
import { SellersController } from "./sellers.controller";
import { SellersService } from "./sellers.service";

describe("SellersController", () => {
  let controller: SellersController;
  const sellersService = {
    searchPlaces: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    toSafeProfile: jest.fn((seller) => ({ id: seller.id })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SellersController],
      providers: [{ provide: SellersService, useValue: sellersService }],
    }).compile();

    controller = module.get<SellersController>(SellersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("returns the current seller profile safely", async () => {
    sellersService.getProfile.mockResolvedValue({ id: 4 });

    await expect(
      controller.me({ sub: 9, email: "seller@test.dev", role: "seller" }),
    ).resolves.toEqual({ seller: { id: 4 } });
  });
});
