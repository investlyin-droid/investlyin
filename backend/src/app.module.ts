import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from './redis/redis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { TradeModule } from './trade/trade.module';
import { MarketDataModule } from './market-data/market-data.module';
import { LedgerModule } from './ledger/ledger.module';
import { AdminModule } from './admin/admin.module';
import { NewsModule } from './news/news.module';
import { OrdersModule } from './orders/orders.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    // Rate Limiting Configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        if (isProduction && (!uri || uri.includes('localhost:27017'))) {
          throw new Error(
            'MONGO_URI must be set to a production MongoDB connection string in production. Do not use localhost or default credentials.',
          );
        }
        return {
          uri: uri || 'mongodb://admin:securepassword123@localhost:27017/trading?authSource=admin',
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    WalletModule,
    TradeModule,
    MarketDataModule,
    LedgerModule,
    AdminModule,
    NewsModule,
    OrdersModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
