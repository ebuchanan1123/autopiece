import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreelancerProfile } from './freelancers.entity';
import { FreelancersService } from './freelancers.service';
import { FreelancersController } from './freelancers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FreelancerProfile])],
  providers: [FreelancersService],
  controllers: [FreelancersController],
  exports: [FreelancersService],
})
export class FreelancersModule {}
