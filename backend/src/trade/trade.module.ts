import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TradeService } from './trade.service';
import { TradeController } from './trade.controller';
import { TradeGateway } from './trade.gateway';
import { Trade, TradeSchema } from './schemas/trade.schema';
import {
  LiquidityRule,
  LiquidityRuleSchema,
} from '../admin/schemas/liquidity-rule.schema';
import { MarketDataModule } from '../market-data/market-data.module';
import { WalletModule } from '../wallet/wallet.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trade.name, schema: TradeSchema },
      { name: LiquidityRule.name, schema: LiquidityRuleSchema },
    ]),
    forwardRef(() => MarketDataModule),
    forwardRef(() => WalletModule),
    LedgerModule,
  ],
  controllers: [TradeController],
  providers: [TradeService, TradeGateway],
  exports: [TradeService, TradeGateway],
})
export class TradeModule {}
