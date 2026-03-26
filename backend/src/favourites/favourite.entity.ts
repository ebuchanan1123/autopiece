import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Listing } from "../listings/listing.entity";

@Entity()
@Index(["clientId", "listingId"], { unique: true })
export class Favourite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  clientId: number;

  @Column({ type: "int" })
  listingId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client: User;

  @ManyToOne(() => Listing, { onDelete: "CASCADE" })
  @JoinColumn({ name: "listingId" })
  listing: Listing;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
