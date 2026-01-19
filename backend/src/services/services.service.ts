import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Service } from './service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import type { JwtUser } from '../auth/types/jwt-user.type';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
  ) {}

  async create(dto: CreateServiceDto, user: JwtUser) {
    if (user.role !== 'freelancer') {
      throw new ForbiddenException('Only freelancers can create services');
    }

    const service = this.repo.create({
      ...dto,
      freelancerId: user.sub,
      status: dto.status ?? 'active',
    });

    return this.repo.save(service);
  }

  async update(id: number, dto: UpdateServiceDto, user: JwtUser) {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException();

    if (service.freelancerId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    Object.assign(service, dto);
    return this.repo.save(service);
  }

  async remove(id: number, user: JwtUser) {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException();

    if (service.freelancerId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    service.status = 'removed';
    return this.repo.save(service);
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findPublic(query: { q?: string; wilaya?: string; city?: string; page?: number }) {
    const qb = this.repo.createQueryBuilder('s')
      .where('s.status = :status', { status: 'active' });

    if (query.q) {
      qb.andWhere('(s.title ILIKE :q OR s.description ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    if (query.wilaya) qb.andWhere('s.wilaya = :wilaya', { wilaya: query.wilaya });
    if (query.city) qb.andWhere('s.city = :city', { city: query.city });

    const page = query.page ?? 1;
    qb.take(20).skip((page - 1) * 20);

    return qb.getMany();
  }
}
