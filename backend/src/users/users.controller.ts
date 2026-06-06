import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { UsersService } from "./users.service";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UpdatePushTokenDto } from "./dto/update-push-token.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@CurrentUser() user: JwtUser) {
    if (user.role !== "admin") throw new ForbiddenException();

    const users = await this.usersService.findAll();
    return { users: users.map((entry) => this.usersService.toSafeUser(entry)) };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtUser) {
    const fullUser = await this.usersService.findById(Number(user.sub));
    if (!fullUser) throw new NotFoundException();
    return { user: this.usersService.toSafeUser(fullUser) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateMeDto) {
    const updated = await this.usersService.updateMe(Number(user.sub), dto);
    if (!updated) throw new NotFoundException();
    return { user: this.usersService.toSafeUser(updated) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/push-token")
  async registerPushToken(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePushTokenDto,
  ) {
    await this.usersService.registerPushToken(Number(user.sub), dto);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me/push-token/remove")
  async removePushToken(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePushTokenDto,
  ) {
    await this.usersService.unregisterPushToken(Number(user.sub), dto.token);
    return { ok: true };
  }
}
