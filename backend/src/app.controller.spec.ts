import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("returns the API name", () => {
      expect(appController.getHello()).toBe("Too Good To Go DZ API");
    });

    it("returns health status", () => {
      expect(appController.health()).toMatchObject({
        ok: true,
        service: "tgtg-api",
      });
    });
  });
});
