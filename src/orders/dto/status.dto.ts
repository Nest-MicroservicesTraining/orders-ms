import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from '@/generated/prisma/client';

export class StatusDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `status must be one of the following values: ${OrderStatusList.join(
      ', ',
    )}`,
  })
  status!: OrderStatus;
}
