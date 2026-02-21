import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { TradeModule } from './trade/trade.module';
import { MarketDataModule } from './market-data/market-data.module';
import { LedgerModule } from './ledger/ledger.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MongoDB is now optional - using in-memory storage
    AuthModule,
    UsersModule,
    WalletModule,
    TradeModule,
    MarketDataModule,
    LedgerModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
