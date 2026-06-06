import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  const usersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    toSafeUser: jest.fn((user) => ({ id: user.id, email: user.email })),
    updateMe: jest.fn(),
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("only lets admins list users and returns safe users", async () => {
    usersService.findAll.mockResolvedValue([{ id: 1, email: "a@test.dev" }]);

    await expect(
      controller.findAll({ sub: 2, email: "u@test.dev", role: "client" }),
    ).rejects.toThrow();

    await expect(
      controller.findAll({ sub: 1, email: "admin@test.dev", role: "admin" }),
    ).resolves.toEqual({ users: [{ id: 1, email: "a@test.dev" }] });
  });
});
