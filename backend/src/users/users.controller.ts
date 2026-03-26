import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { UsersService } from "./users.service";
import { User } from "./user.entity";
import { UpdateMeDto } from "./dto/update-me.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
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
}
