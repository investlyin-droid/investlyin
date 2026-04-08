import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { TradeGateway } from './trade.gateway';
import { MatchingEngineService } from './matching-engine.service';
import { Trade, TradeSchema } from './schemas/trade.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  LiquidityRule,
  LiquidityRuleSchema,
} from '../admin/schemas/liquidity-rule.schema';
import { MarketDataModule } from '../market-data/market-data.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Trade.name, schema: TradeSchema },
      { name: Order.name, schema: OrderSchema },
      { name: LiquidityRule.name, schema: LiquidityRuleSchema },
    ]),
    forwardRef(() => MarketDataModule),
    forwardRef(() => WalletModule),
  ],
  controllers: [TradeController],
  providers: [TradeService, TradeGateway, MatchingEngineService],
  exports: [TradeService, TradeGateway, MatchingEngineService],
})
export class TradeModule { }
