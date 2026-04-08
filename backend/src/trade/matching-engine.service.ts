import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trade, TradeDocument, TradeStatus, TradeDirection } from './schemas/trade.schema';
import { Order, OrderDocument, OrderStatus, OrderType } from '../orders/schemas/order.schema';
import { MarketDataService, MarketPrice } from '../market-data/market-data.service';
import { TradeService } from './trade.service';

@Injectable()
export class MatchingEngineService implements OnModuleInit {
    private readonly logger = new Logger(MatchingEngineService.name);

    constructor(
        @InjectModel(Trade.name) private tradeModel: Model<TradeDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        private marketDataService: MarketDataService,
        private tradeService: TradeService,
    ) { }

    onModuleInit() {
        this.marketDataService.priceUpdates$.subscribe((price) => {
            this.processPriceUpdate(price).catch((err) => {
                this.logger.error(`Error processing price update for ${price.symbol}: ${err.message}`);
            });
        });
    }

    private async processPriceUpdate(price: MarketPrice) {
        // 1. Process Pending Orders (Limit/Stop)
        await this.processPendingOrders(price);

        // 2. Process SL/TP for Open Trades
        await this.processSLTP(price);

        // 3. Process Liquidation
        await this.processLiquidation(price);
    }

    private async processPendingOrders(price: MarketPrice) {
        const orders = await this.orderModel.find({
            symbol: price.symbol,
            status: OrderStatus.PENDING,
        });

        for (const order of orders) {
            let shouldExecute = false;
            let executionPrice = 0;

            if (order.orderType === OrderType.LIMIT && order.limitPrice != null) {
                if (order.direction === 'BUY' && price.ask <= order.limitPrice) {
                    shouldExecute = true;
                    executionPrice = price.ask;
                } else if (order.direction === 'SELL' && price.bid >= order.limitPrice) {
                    shouldExecute = true;
                    executionPrice = price.bid;
                }
            } else if (order.orderType === OrderType.STOP && order.triggerPrice != null) {
                if (order.direction === 'BUY' && price.ask >= order.triggerPrice) {
                    shouldExecute = true;
                    executionPrice = price.ask;
                } else if (order.direction === 'SELL' && price.bid <= order.triggerPrice) {
                    shouldExecute = true;
                    executionPrice = price.bid;
                }
            }

            if (shouldExecute) {
                try {
                    this.logger.log(`Executing ${order.orderType} order ${order._id} for user ${order.userId} at ${executionPrice}`);

                    // Mark order as filled first to avoid double execution
                    order.status = OrderStatus.FILLED;
                    await order.save();

                    // Open the actual trade
                    await this.tradeService.openTrade(
                        order.userId,
                        order.symbol,
                        order.direction as TradeDirection,
                        order.lotSize,
                        executionPrice,
                    );
                } catch (error) {
                    this.logger.error(`Failed to execute order ${order._id}: ${error.message}`);
                    // Rollback status if opening trade failed
                    order.status = OrderStatus.PENDING;
                    await order.save();
                }
            }
        }
    }

    private async processSLTP(price: MarketPrice) {
        const trades = await this.tradeModel.find({
            symbol: price.symbol,
            status: TradeStatus.OPEN,
            $or: [{ sl: { $exists: true, $ne: null } }, { tp: { $exists: true, $ne: null } }],
        });

        for (const trade of trades) {
            let shouldClose = false;
            let closeReason = '';
            let closePrice = 0;

            if (trade.direction === TradeDirection.BUY) {
                // Long trade closes at Bid price
                if (trade.sl && price.bid <= trade.sl) {
                    shouldClose = true;
                    closeReason = 'Stop Loss';
                    closePrice = price.bid;
                } else if (trade.tp && price.bid >= trade.tp) {
                    shouldClose = true;
                    closeReason = 'Take Profit';
                    closePrice = price.bid;
                }
            } else {
                // Short trade closes at Ask price
                if (trade.sl && price.ask >= trade.sl) {
                    shouldClose = true;
                    closeReason = 'Stop Loss';
                    closePrice = price.ask;
                } else if (trade.tp && price.ask <= trade.tp) {
                    shouldClose = true;
                    closeReason = 'Take Profit';
                    closePrice = price.ask;
                }
            }

            if (shouldClose) {
                try {
                    this.logger.log(`Auto-closing trade ${trade._id} (${closeReason}) at ${closePrice}`);
                    await this.tradeService.closeTrade(
                        trade._id.toString(),
                        closePrice,
                        undefined,
                        closeReason,
                        'engine',
                    );
                } catch (error) {
                    this.logger.error(`Failed to auto-close trade ${trade._id}: ${error.message}`);
                }
            }
        }
    }
    private async processLiquidation(price: MarketPrice) {
        // Find all users who have open trades for this symbol
        const trades = await this.tradeModel.find({
            symbol: price.symbol,
            status: TradeStatus.OPEN,
        });

        const userIds = [...new Set(trades.map((t) => t.userId))];

        for (const userId of userIds) {
            const equityData = await this.tradeService.calculateUserEquity(userId);

            // Margin Level < 50% is a Stop Out
            if (equityData.marginLevel < 50) {
                this.logger.warn(
                    `MARGIN STOP OUT for user ${userId}. Margin Level: ${equityData.marginLevel.toFixed(2)}%`,
                );

                const allUserTrades = await this.tradeModel.find({
                    userId,
                    status: TradeStatus.OPEN,
                });

                let worstTrade: any = null;
                let worstPnL = Infinity;

                for (const t of allUserTrades) {
                    const pData = this.marketDataService.getPrice(t.symbol);
                    if (!pData) continue;

                    const cp = t.direction === TradeDirection.BUY ? pData.bid : pData.ask;
                    const pnl = this.tradeService.calculatePnL(
                        t.direction,
                        t.openPrice,
                        cp,
                        t.lotSize,
                        t.symbol,
                    );

                    if (pnl < worstPnL) {
                        worstPnL = pnl;
                        worstTrade = t;
                    }
                }

                if (worstTrade) {
                    const pData = this.marketDataService.getPrice(worstTrade.symbol);
                    const closePrice = pData
                        ? worstTrade.direction === TradeDirection.BUY
                            ? pData.bid
                            : pData.ask
                        : worstTrade.openPrice;

                    this.logger.log(
                        `Liquidating trade ${worstTrade._id} for user ${userId} at ${closePrice} (Stop Out)`,
                    );
                    await this.tradeService.closeTrade(
                        worstTrade._id.toString(),
                        closePrice,
                        undefined,
                        'Liquidation',
                        'engine',
                    );
                }
            }
        }
    }
}
