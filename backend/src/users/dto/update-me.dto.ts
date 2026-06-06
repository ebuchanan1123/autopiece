import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class NotificationSettingsDto {
  @IsBoolean()
  calendarReminders: boolean;

  @IsBoolean()
  emailUpdates: boolean;

  @IsBoolean()
  pushNotifications: boolean;

  @IsBoolean()
  importantUpdates: boolean;

  @IsBoolean()
  announcements: boolean;

  @IsBoolean()
  surpriseBagAlerts: boolean;
}

export class UpdateMeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dietaryPreferences?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  preferredPickupTimes?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;
}
