import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PublicSupportController } from './public-support.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminAllowlistGuard } from '../auth/guards/admin-allowlist.guard';
import {
  LiquidityRule,
  LiquidityRuleSchema,
} from './schemas/liquidity-rule.schema';
import { AdminAudit, AdminAuditSchema } from './schemas/admin-audit.schema';
import {
  PaymentConfig,
  PaymentConfigDocument,
  PaymentConfigSchema,
} from './schemas/payment-config.schema';
import {
  SupportConfig,
  SupportConfigSchema,
} from './schemas/support-config.schema';
import { TradeModule } from '../trade/trade.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { LedgerModule } from '../ledger/ledger.module';
import { OrdersModule } from '../orders/orders.module';
import { Trade, TradeSchema } from '../trade/schemas/trade.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiquidityRule.name, schema: LiquidityRuleSchema },
      { name: AdminAudit.name, schema: AdminAuditSchema },
      { name: PaymentConfig.name, schema: PaymentConfigSchema },
      { name: SupportConfig.name, schema: SupportConfigSchema },
      { name: Trade.name, schema: TradeSchema },
    ]),
    TradeModule,
    WalletModule,
    UsersModule,
    LedgerModule,
    OrdersModule,
  ],
  controllers: [AdminController, PublicSupportController],
  providers: [AdminService, AdminAuditService, AdminAllowlistGuard],
  exports: [AdminService],
})
export class AdminModule { }
