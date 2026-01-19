import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn([
    'paid',
    'in_progress',
    'delivered',
    'cancelled',
    'completed',
    'refunded',
    'revision_requested',
  ])
  status:
    | 'paid'
    | 'in_progress'
    | 'delivered'
    | 'cancelled'
    | 'completed'
    | 'refunded'
    | 'revision_requested';
}
