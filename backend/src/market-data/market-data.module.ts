import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataGateway } from './market-data.gateway';

@Module({
  imports: [ConfigModule],
  controllers: [MarketDataController],
  providers: [MarketDataService, MarketDataGateway],
  exports: [MarketDataService, MarketDataGateway],
})
export class MarketDataModule {}
