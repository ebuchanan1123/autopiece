import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SellersService } from "./sellers.service";
import { SellerProfile } from "./seller.entity";

describe("SellersService", () => {
  let service: SellersService;
  const sellerRepo = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: getRepositoryToken(SellerProfile), useValue: sellerRepo },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns a safe seller profile", () => {
    expect(
      service.toSafeProfile({
        id: 1,
        storeName: " Bakery ",
        address: " Main St ",
        city: "Algiers",
        wilaya: "Algiers",
        phone: "0555",
        businessType: null,
        placeId: null,
        lat: 36.7,
        lng: 3.1,
        logoUrl: null,
        isVerified: true,
      } as SellerProfile),
    ).toMatchObject({
      id: 1,
      storeName: "Bakery",
      isVerified: true,
    });
  });
});
