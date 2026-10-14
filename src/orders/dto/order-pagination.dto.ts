import { PaginationDto } from '@/common';
import { OrderStatus } from '@/generated/prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `status must be one of the following values: ${OrderStatusList.join(
      ', ',
    )}`,
  })
  status?: OrderStatus;
}
