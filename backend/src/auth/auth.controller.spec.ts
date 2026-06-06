import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  const authService = {
    registerClient: jest.fn(),
    registerSeller: jest.fn(),
    login: jest.fn(),
    rotateRefreshSession: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("sets refresh token as a cookie during login", async () => {
    authService.login.mockResolvedValue({
      user: { id: 1 },
      accessToken: "access",
      refreshCookieValue: "refresh",
    });
    const res = { cookie: jest.fn() } as any;
    const req = {
      headers: {},
      ip: "127.0.0.1",
    } as any;

    await expect(
      controller.login(req, { email: "a@test.dev", password: "password" }, res),
    ).resolves.toMatchObject({ accessToken: "access" });
    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "refresh",
      expect.objectContaining({ httpOnly: true, path: "/auth" }),
    );
  });
});
