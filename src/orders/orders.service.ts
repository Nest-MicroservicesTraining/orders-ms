import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '@/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  ChangeOrderStatusDto,
  OrderPaginationDto,
  OrderWithProducts,
  PaidOrderDto,
  PaymentSessionResponse,
} from './dto';
import { NATS_SERVICE } from '@/config';
import { normalizeRpcError } from '@/common/exceptions/normalize-rcp-error';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
    private prisma: PrismaService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // const order = await this.prisma.order.create({ data: createOrderDto });
    // return order;
    const ids = createOrderDto.items.map((item) => item.productId);
    try {
      // 1. Verificar los productos
      // const products: { id: number; price: number; name: string }[] =
      //   await firstValueFrom(
      //     this.productsClient.send<
      //       { id: number; price: number; name: string }[]
      //     >({ cmd: 'validate_products' }, ids),
      //   );

      const products = await this.validateProducts(ids);

      // 2. Calculo de valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find((p) => p.id === orderItem.productId)!.price;
        return acc + price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      // 3. Construir detalle de la orden
      const details = createOrderDto.items.map((item) => {
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: products.find((p) => p.id == item.productId)!.price,
        };
      });

      // 3. Crear una transaccion en la base de datos
      const order = await this.prisma.order.create({
        data: {
          totalAmount,
          totalItems,
          orderItems: {
            createMany: {
              data: details,
            },
          },
        },
        include: {
          orderItems: {
            select: { productId: true, quantity: true, price: true },
          },
        },
      });

      return {
        ...order,
        orderItems: order.orderItems.map((item) => ({
          ...item,
          name: products.find((p) => p.id === item.productId)?.name || '',
          total: item.price * item.quantity,
        })),
      };
    } catch (error) {
      throw new RpcException(normalizeRpcError(error));
    }
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
      include: {
        orderItems: {
          select: { productId: true, quantity: true, price: true },
        },
      },
    });
    // const orderItemsWithName = await

    if (!order)
      throw new RpcException({
        message: `Order with ID #${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });

    const productIds = order.orderItems.map((item) => item.productId);

    try {
      const products = await this.validateProducts(productIds);
      return {
        ...order,
        orderItems: order.orderItems.map((item) => ({
          ...item,
          name: products.find((p) => p.id === item.productId)?.name || '',
          total: item.price * item.quantity,
        })),
      };
    } catch (error) {
      throw new RpcException(normalizeRpcError(error));
    }
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

  private async validateProducts(
    ids: number[],
  ): Promise<{ id: number; price: number; name: string }[]> {
    return await firstValueFrom(
      this.client.send<{ id: number; price: number; name: string }[]>(
        { cmd: 'validate_products' },
        ids,
      ),
    );
  }

  public async createPaymentSession(order: OrderWithProducts) {
    try {
      const paymentSession = await firstValueFrom(
        this.client.send<PaymentSessionResponse>('create.payment.session', {
          orderId: order.id,
          currency: 'usd',
          items: order.orderItems.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      );

      console.log('Payment session created:', paymentSession);
      return paymentSession;
    } catch (error) {
      console.error('Error creating payment session:', error);
      throw new RpcException(normalizeRpcError(error));
    }
  }

  async paidOrder(paidOrderDto: PaidOrderDto) {
    const updatedOrder = await this.prisma.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,

        // La relacion
        orderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });

    this.logger.log(`Order with ID #${paidOrderDto.orderId} marked as PAID.`);

    return updatedOrder;
  }
}
