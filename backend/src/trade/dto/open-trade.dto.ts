import { IsString, IsNumber, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { TradeDirection } from '../schemas/trade.schema';

export class OpenTradeDto {
  @IsString()
  symbol: string;

  @IsEnum(TradeDirection)
  direction: TradeDirection;

  @IsNumber()
  @Min(0.01, { message: 'Lot size must be at least 0.01' })
  @Max(1000, { message: 'Lot size must not exceed 1000' })
  lotSize: number;

  @IsNumber()
  @Min(0.00001, { message: 'Market price must be greater than 0' })
  marketPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sl?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tp?: number;
}
