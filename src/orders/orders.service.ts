import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '@/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const order = await this.prisma.order.create({ data: createOrderDto });
    return order;
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10, status } = orderPaginationDto;
    const total = await this.prisma.order.count({
      where: status ? { status } : undefined,
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: await this.prisma.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: status ? { status } : undefined,
      }),
      meta: {
        total_records: total,
        records_per_page: limit,
        current_page: page,
        total_pages: totalPages,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order)
      throw new RpcException({
        message: `Order with ID #${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    return order;
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (order.status === status)
      throw new RpcException({
        message: `Order with ID #${id} already has status ${status}`,
        status: HttpStatus.BAD_REQUEST,
      });

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
