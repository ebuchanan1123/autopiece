import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SellerProfile } from "./seller.entity";
import { UpdateSellerProfileDto } from "./dto/update-seller-profile.dto";

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(SellerProfile)
    private readonly sellerRepo: Repository<SellerProfile>,
  ) {}

  async createProfile(params: {
    userId: number;
    storeName: string;
    address: string;
    city: string;
    wilaya: string;
    phone: string;
    businessType?: string | null;
    placeId?: string | null;
    lat?: number | null;
    lng?: number | null;
    logoUrl?: string | null;
  }) {
    const profile = this.sellerRepo.create({
      user: { id: params.userId } as any,
      storeName: params.storeName.trim(),
      address: params.address.trim(),
      city: params.city.trim(),
      wilaya: params.wilaya.trim(),
      phone: params.phone.trim(),
      businessType: params.businessType?.trim() || null,
      placeId: params.placeId?.trim() || null,
      lat: Number.isFinite(params.lat as number) ? (params.lat ?? null) : null,
      lng: Number.isFinite(params.lng as number) ? (params.lng ?? null) : null,
      logoUrl: params.logoUrl?.trim() || null,
      isVerified: false,
    });

    return this.sellerRepo.save(profile);
  }

  private normalizeOptional(value?: string | null, max = 255) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  }

  async getProfile(userId: number) {
    return this.sellerRepo
      .createQueryBuilder("seller")
      .leftJoinAndSelect("seller.user", "user")
      .where("user.id = :userId", { userId })
      .getOne();
  }

  toSafeProfile(profile: SellerProfile) {
    return {
      id: profile.id,
      storeName: this.normalizeOptional(profile.storeName, 140) ?? "",
      address: this.normalizeOptional(profile.address, 300) ?? "",
      city: this.normalizeOptional(profile.city, 80) ?? "",
      wilaya: this.normalizeOptional(profile.wilaya, 80) ?? "",
      phone: this.normalizeOptional(profile.phone, 40) ?? "",
      businessType: this.normalizeOptional(profile.businessType, 80),
      placeId: this.normalizeOptional(profile.placeId, 255),
      lat: Number.isFinite(profile.lat as number) ? profile.lat : null,
      lng: Number.isFinite(profile.lng as number) ? profile.lng : null,
      logoUrl: this.normalizeOptional(profile.logoUrl, 700000),
      isVerified: Boolean(profile.isVerified),
    };
  }

  async updateProfile(userId: number, dto: UpdateSellerProfileDto) {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    if (dto.storeName !== undefined) {
      profile.storeName =
        this.normalizeOptional(dto.storeName, 140) ?? profile.storeName;
    }
    if (dto.businessType !== undefined) {
      profile.businessType = this.normalizeOptional(dto.businessType, 80);
    }
    if (dto.address !== undefined) {
      profile.address =
        this.normalizeOptional(dto.address, 300) ?? profile.address;
    }
    if (dto.city !== undefined) {
      profile.city = this.normalizeOptional(dto.city, 80) ?? profile.city;
    }
    if (dto.wilaya !== undefined) {
      profile.wilaya = this.normalizeOptional(dto.wilaya, 80) ?? profile.wilaya;
    }
    if (dto.phone !== undefined) {
      profile.phone = this.normalizeOptional(dto.phone, 40) ?? profile.phone;
    }
    if (dto.logoUrl !== undefined) {
      profile.logoUrl = this.normalizeOptional(dto.logoUrl, 700000);
    }
    if (dto.lat !== undefined) {
      profile.lat = Number.isFinite(dto.lat) ? dto.lat : profile.lat;
    }
    if (dto.lng !== undefined) {
      profile.lng = Number.isFinite(dto.lng) ? dto.lng : profile.lng;
    }

    return this.sellerRepo.save(profile);
  }

  async searchPlaces(query: string) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const textQuery = query.trim();
    if (!textQuery) return [];
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Business search is unavailable until GOOGLE_MAPS_API_KEY is configured on the backend.",
      );
    }

    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.nationalPhoneNumber",
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 6,
          regionCode: "DZ",
        }),
      },
    );

    if (!res.ok) return [];

    const data = (await res.json().catch(() => null)) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        primaryTypeDisplayName?: { text?: string };
        nationalPhoneNumber?: string;
      }>;
    } | null;

    return (data?.places ?? []).map((place) => ({
      id: place.id ?? "",
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? "",
      businessType: place.primaryTypeDisplayName?.text ?? "",
      phone: place.nationalPhoneNumber ?? "",
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
    }));
  }
}
