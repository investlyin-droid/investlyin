import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus, OrderType } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(
    userId: string,
    symbol: string,
    direction: string,
    lotSize: number,
    orderType: OrderType,
    triggerPrice?: number,
    limitPrice?: number,
  ): Promise<OrderDocument> {
    if (orderType === OrderType.LIMIT && limitPrice == null) {
      throw new BadRequestException('Limit orders require limitPrice');
    }
    if (orderType === OrderType.STOP && triggerPrice == null) {
      throw new BadRequestException('Stop orders require triggerPrice');
    }
    if (lotSize <= 0 || lotSize > 100) {
      throw new BadRequestException('Lot size must be between 0.01 and 100');
    }

    const order = new this.orderModel({
      userId,
      symbol,
      direction,
      lotSize,
      orderType,
      triggerPrice,
      limitPrice,
      status: OrderStatus.PENDING,
    });
    return order.save();
  }

  async findByUser(userId: string, status?: OrderStatus): Promise<OrderDocument[]> {
    const filter: any = { userId };
    if (status) filter.status = status;
    return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<OrderDocument | null> {
    return this.orderModel.findById(id).exec();
  }

  async cancel(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ _id: id, userId });
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    order.status = OrderStatus.CANCELLED;
    return order.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    status?: string,
    symbol?: string,
    orderType?: string,
  ): Promise<{ data: OrderDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (symbol) filter.symbol = symbol;
    if (orderType) filter.orderType = orderType;
    
    const [data, total] = await Promise.all([
      this.orderModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUserId(userId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.orderModel.findByIdAndDelete(id).exec();
  }
}
