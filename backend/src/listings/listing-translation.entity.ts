import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Listing } from "./listing.entity";

export type TranslationLang = "en" | "fr" | "ar";

@Entity()
@Index(["listingId", "lang"], { unique: true })
export class ListingTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  listingId: number;

  @ManyToOne(() => Listing, { onDelete: "CASCADE" })
  @JoinColumn({ name: "listingId" })
  listing: Listing;

  @Column({ type: "varchar", length: 2 })
  lang: TranslationLang;

  @Column({ type: "text" })
  title: string;

  @Column({ type: "text" })
  description: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
