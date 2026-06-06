import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { SellersService } from "../sellers/sellers.service";
import { RefreshSession } from "./refresh-session.entity";

describe("AuthService", () => {
  let service: AuthService;
  const usersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    toSafeUser: jest.fn((user) => ({ id: user.id, email: user.email })),
    isLocked: jest.fn(),
    recordFailedLogin: jest.fn(),
    resetLoginFailures: jest.fn(),
    updatePasswordHash: jest.fn(),
    findById: jest.fn(),
  };
  const sellersService = { createProfile: jest.fn() };
  const jwtService = { sign: jest.fn(() => "access-token") };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "JWT_EXPIRES_IN") return "15m";
      if (key === "JWT_REFRESH_EXPIRES_IN") return "30d";
      if (key === "SESSION_FINGERPRINT_SECRET") {
        return "test_fingerprint_secret_123456789012345678901234567890";
      }
      return undefined;
    }),
  };
  const refreshRepo = {
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: SellersService, useValue: sellersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(RefreshSession), useValue: refreshRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("registers clients with safe user output", async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockImplementation(async (user) => ({
      id: 1,
      ...user,
    }));

    await expect(
      service.registerClient({
        username: "Test User",
        email: "TEST@EXAMPLE.COM",
        password: "very-secure-password",
        phone: "0555",
      }),
    ).resolves.toMatchObject({
      user: { id: 1, email: "test@example.com" },
      accessToken: "access-token",
    });
  });
});
