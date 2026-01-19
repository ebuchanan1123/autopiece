import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../guards/roles.guard';

export const Roles = (...roles: string[]) =>
  UseGuards(new RolesGuard(roles));
