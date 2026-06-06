import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import type { JwtUser } from "../auth/types/jwt-user.type";

const adminUser: JwtUser = {
  sub: "1",
  email: "admin@example.com",
  role: "admin",
};

const clientUser: JwtUser = {
  sub: "2",
  email: "client@example.com",
  role: "client",
};

function makeController() {
  const userQb = {
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const userRepo = { find: jest.fn(), createQueryBuilder: jest.fn(() => userQb) };
  const sellerRepo = { find: jest.fn(), save: jest.fn() };
  const listingRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
  const orderRepo = { find: jest.fn(), findOne: jest.fn() };
  const orderItemRepo = { find: jest.fn() };
  const paymentRepo = { findOne: jest.fn() };
  const usersService = {
    toSafeUser: jest.fn((user) => ({ id: user.id, email: user.email })),
  };
  const sellersService = {
    getProfile: jest.fn(),
    toSafeProfile: jest.fn((profile) => ({
      id: profile.id,
      isVerified: profile.isVerified,
    })),
  };
  const audit = { record: jest.fn(), recent: jest.fn() };

  const controller = new AdminController(
    userRepo as any,
    sellerRepo as any,
    listingRepo as any,
    orderRepo as any,
    orderItemRepo as any,
    paymentRepo as any,
    usersService as any,
    sellersService as any,
    audit as any,
  );

  return {
    controller,
    userRepo,
    userQb,
    sellerRepo,
    listingRepo,
    orderRepo,
    orderItemRepo,
    paymentRepo,
    usersService,
    sellersService,
    audit,
  };
}

describe("AdminController", () => {
  it("rejects non-admin users", async () => {
    const { controller } = makeController();

    await expect(controller.users(clientUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("returns safe users for admins", async () => {
    const { controller, userQb, usersService } = makeController();
    userQb.getMany.mockResolvedValue([
      { id: 1, email: "admin@example.com", passwordHash: "secret" },
    ]);

    await expect(controller.users(adminUser)).resolves.toEqual({
      users: [{ id: 1, email: "admin@example.com" }],
    });
    expect(usersService.toSafeUser).toHaveBeenCalledWith({
      id: 1,
      email: "admin@example.com",
      passwordHash: "secret",
    });
  });

  it("records audit events when seller verification changes", async () => {
    const { controller, sellerRepo, sellersService, audit } = makeController();
    const profile = { id: 10, userId: 22, isVerified: false };
    sellersService.getProfile.mockResolvedValue(profile);
    sellerRepo.save.mockImplementation(async (entry) => entry);

    await expect(
      controller.updateSellerVerification(adminUser, "22", {
        isVerified: true,
      }),
    ).resolves.toEqual({ seller: { id: 10, isVerified: true } });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: "seller.verification.updated",
        entityType: "seller_profile",
        entityId: 10,
      }),
    );
  });

  it("rejects unsupported listing statuses", async () => {
    const { controller } = makeController();

    await expect(
      controller.updateListingStatus(adminUser, "3", { status: "archived" as any }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("records audit events when listing status changes", async () => {
    const { controller, listingRepo, audit } = makeController();
    listingRepo.findOne.mockResolvedValue({ id: 3, status: "active" });
    listingRepo.save.mockImplementation(async (entry) => entry);

    await expect(
      controller.updateListingStatus(adminUser, "3", { status: "hidden" }),
    ).resolves.toEqual({ listing: { id: 3, status: "hidden" } });

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 1,
        action: "listing.status.updated",
        entityType: "listing",
        entityId: 3,
        metadata: { previousStatus: "active", status: "hidden" },
      }),
    );
  });
});
