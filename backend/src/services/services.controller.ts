import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';

@Controller('Services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  findPublic(@Query() query: any) {
    return this.service.findPublic(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(+id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(+id, user);
  }
}
