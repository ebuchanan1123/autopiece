import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Listing } from './listing.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import type { JwtUser } from '../auth/types/jwt-user.type';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly repo: Repository<Listing>,
  ) {}

  async create(dto: CreateListingDto, user: JwtUser) {
    if (user.role !== 'seller') {
      throw new ForbiddenException('Only sellers can create listings');
    }

    const listing = this.repo.create({
      ...dto,
      sellerId: user.sub,
      status: dto.status ?? 'active',
    });

    return this.repo.save(listing);
  }

  async update(id: number, dto: UpdateListingDto, user: JwtUser) {
    const listing = await this.repo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException();

    if (listing.sellerId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    Object.assign(listing, dto);
    return this.repo.save(listing);
  }

  async remove(id: number, user: JwtUser) {
    const listing = await this.repo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException();

    if (listing.sellerId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    listing.status = 'removed';
    return this.repo.save(listing);
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findPublic(query: { q?: string; wilaya?: string; city?: string; page?: number }) {
    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.status = :status', { status: 'active' });

    if (query.q) {
      qb.andWhere('(l.title ILIKE :q OR l.description ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    if (query.wilaya) qb.andWhere('l.wilaya = :wilaya', { wilaya: query.wilaya });
    if (query.city) qb.andWhere('l.city = :city', { city: query.city });

    const page = query.page ?? 1;
    qb.take(20).skip((page - 1) * 20);

    return qb.getMany();
  }
  async mapPins(params: { minLat: number; minLng: number; maxLat: number; maxLng: number }) {
    return this.repo.createQueryBuilder('l')
      .select(['l.id', 'l.title', 'l.priceDzd', 'l.lat', 'l.lng', 'l.city', 'l.wilaya', 'l.pickupStartAt', 'l.pickupEndAt'])
      .where('l.status = :status', { status: 'active' })
      .andWhere('l.lat IS NOT NULL AND l.lng IS NOT NULL')
      .andWhere('l.lat BETWEEN :minLat AND :maxLat', params)
      .andWhere('l.lng BETWEEN :minLng AND :maxLng', params)
      .getMany();
  }

}
