import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['orderItemId', 'createdAt'])
export class OrderDelivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderItemId: number;

  @Column({ type: 'text' })
  message: string;

  // [{ name, url, size, mimeType }]
  @Column({ type: 'jsonb', nullable: true })
  attachments: any[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
