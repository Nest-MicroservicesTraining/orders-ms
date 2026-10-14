import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from '@/generated/prisma/enums';

export class ChangeOrderStatusDto {
  @IsUUID()
  id!: string;
  @IsEnum(OrderStatusList, {
    message: `status must be one of the following values: ${OrderStatusList.join(
      ', ',
    )}`,
  })
  status!: OrderStatus;
}
