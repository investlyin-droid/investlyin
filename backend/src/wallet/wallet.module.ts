import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { DepositIntent, DepositIntentSchema } from './schemas/deposit-intent.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';
import { LedgerModule } from '../ledger/ledger.module';
import { TradeModule } from '../trade/trade.module';
import { PaymentConfig, PaymentConfigSchema } from '../admin/schemas/payment-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: DepositIntent.name, schema: DepositIntentSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: PaymentConfig.name, schema: PaymentConfigSchema },
    ]),
    LedgerModule,
    forwardRef(() => TradeModule),
  ],
  controllers: [WalletController],
  providers: [WalletService, DepositService, WithdrawalService],
  exports: [WalletService, DepositService, WithdrawalService],
})
export class WalletModule {}
