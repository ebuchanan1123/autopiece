import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { User } from "./user.entity";
import { UserPushToken } from "./user-push-token.entity";

describe("UsersService", () => {
  let service: UsersService;
  const userRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const pushRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserPushToken), useValue: pushRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("removes sensitive fields from safe users", () => {
    const safe = service.toSafeUser({
      id: 1,
      email: "a@test.dev",
      passwordHash: "secret",
      failedLoginCount: 3,
      lastFailedLoginAt: new Date(),
      lockUntil: null,
      preferredPickupTimes: ["Evening"],
      notificationSettings: null,
    } as any);

    expect(safe).toMatchObject({ id: 1, email: "a@test.dev" });
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe).not.toHaveProperty("failedLoginCount");
  });
});
