import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { OrderType, OrderStatus } from './schemas/order.schema';

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(
    @Request() req,
    @Body()
    body: {
      symbol: string;
      direction: string;
      lotSize: number;
      orderType: OrderType;
      triggerPrice?: number;
      limitPrice?: number;
    },
  ) {
    return this.ordersService.create(
      req.user.userId,
      body.symbol,
      body.direction,
      body.lotSize,
      body.orderType,
      body.triggerPrice,
      body.limitPrice,
    );
  }

  @Get()
  async list(@Request() req, @Query('status') status?: OrderStatus) {
    return this.ordersService.findByUser(req.user.userId, status);
  }

  @Get('pending')
  async listPending(@Request() req) {
    return this.ordersService.findByUser(req.user.userId, OrderStatus.PENDING);
  }

  @Delete(':id')
  async cancel(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancel(id, req.user.userId);
  }
}
